import { classifyAgentFeedback } from "@notra/ai/jobs/feedback-classifier";
import { agentFeedback, projects } from "@notra/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { nanoid } from "nanoid";

import {
  FeedbackDatabaseError,
  FeedbackNotFoundError,
  FeedbackProjectNotFoundError,
} from "../errors/feedback";
import type {
  ListFeedbackProgramInput,
  ListFeedbackProgramSuccess,
  NamedFeedbackProgramInput,
  SubmitFeedbackProgramInput,
  SubmitFeedbackProgramSuccess,
  UpdateFeedbackProgramInput,
} from "../types/feedback";

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new FeedbackDatabaseError({ cause }),
  });

const classifyFeedback = (
  params: Parameters<typeof classifyAgentFeedback>[0]
) =>
  Effect.tryPromise({
    try: () => classifyAgentFeedback(params),
    catch: (cause) => new FeedbackDatabaseError({ cause }),
  });

const projectExists = (
  db: SubmitFeedbackProgramInput["db"],
  organizationId: string,
  projectId: string
) =>
  database(() =>
    db.query.projects.findFirst({
      columns: { id: true },
      where: and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      ),
    })
  ).pipe(Effect.map((project) => project !== undefined));

const findByIdempotencyKey = (
  db: SubmitFeedbackProgramInput["db"],
  organizationId: string,
  idempotencyKey: string
) =>
  database(() =>
    db.query.agentFeedback.findFirst({
      where: and(
        eq(agentFeedback.organizationId, organizationId),
        eq(agentFeedback.idempotencyKey, idempotencyKey)
      ),
    })
  );

const findByOrganizationAndId = (
  db: NamedFeedbackProgramInput["db"],
  organizationId: string,
  feedbackId: string
) =>
  database(() =>
    db.query.agentFeedback.findFirst({
      where: and(
        eq(agentFeedback.organizationId, organizationId),
        eq(agentFeedback.id, feedbackId)
      ),
    })
  );

export const listFeedback = Effect.fn("feedback.list")(function* ({
  db,
  organizationId,
  query,
}: ListFeedbackProgramInput) {
  const conditions = [eq(agentFeedback.organizationId, organizationId)];
  if (query.status) {
    conditions.push(eq(agentFeedback.status, query.status));
  }
  if (query.kind) {
    conditions.push(eq(agentFeedback.kind, query.kind));
  }
  if (query.projectId) {
    conditions.push(eq(agentFeedback.projectId, query.projectId));
  }
  const where = and(...conditions);

  const [[totals], rows] = yield* database(() =>
    Promise.all([
      db.select({ total: count() }).from(agentFeedback).where(where),
      db
        .select()
        .from(agentFeedback)
        .where(where)
        .orderBy(desc(agentFeedback.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
    ])
  );

  const totalItems = totals?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

  return {
    feedback: rows,
    pagination: {
      limit: query.limit,
      currentPage: query.page,
      nextPage: query.page < totalPages ? query.page + 1 : null,
      previousPage: query.page > 1 ? query.page - 1 : null,
      totalPages,
      totalItems,
    },
  } satisfies ListFeedbackProgramSuccess;
});

export const getFeedback = Effect.fn("feedback.get")(function* (
  input: NamedFeedbackProgramInput
) {
  const row = yield* findByOrganizationAndId(
    input.db,
    input.organizationId,
    input.feedbackId
  );

  if (!row) {
    return yield* new FeedbackNotFoundError();
  }

  return row;
});

export const updateFeedback = Effect.fn("feedback.update")(function* ({
  db,
  organizationId,
  feedbackId,
  body,
}: UpdateFeedbackProgramInput) {
  const [updated] = yield* database(() =>
    db
      .update(agentFeedback)
      .set({
        status: body.status,
        resolvedAt: body.status === "resolved" ? new Date() : null,
      })
      .where(
        and(
          eq(agentFeedback.organizationId, organizationId),
          eq(agentFeedback.id, feedbackId)
        )
      )
      .returning()
  );

  if (!updated) {
    return yield* new FeedbackNotFoundError();
  }

  return updated;
});

export const submitFeedback = Effect.fn("feedback.submit")(function* ({
  db,
  organizationId,
  body,
  ingestProjectId,
  userAgent,
}: SubmitFeedbackProgramInput) {
  const idempotencyKey = body.idempotencyKey;
  if (idempotencyKey) {
    const existing = yield* findByIdempotencyKey(
      db,
      organizationId,
      idempotencyKey
    );
    if (existing) {
      return {
        feedback: existing,
        deduplicated: true,
      } satisfies SubmitFeedbackProgramSuccess;
    }
  }

  const projectId =
    ingestProjectId === undefined ? (body.projectId ?? null) : ingestProjectId;

  if (
    ingestProjectId === undefined &&
    projectId &&
    !(yield* projectExists(db, organizationId, projectId))
  ) {
    return yield* new FeedbackProjectNotFoundError();
  }

  const feedbackId = nanoid();
  const needsClassification = !(body.kind && body.sentiment && body.title);
  const classification = needsClassification
    ? yield* classifyFeedback({
        organizationId,
        feedbackId,
        message: body.message,
        title: body.title,
        contextUrl: body.contextUrl,
        agentClient: body.agentClient,
      })
    : null;

  const [created] = yield* database(() =>
    db
      .insert(agentFeedback)
      .values({
        id: feedbackId,
        organizationId,
        projectId,
        source: body.source,
        kind: body.kind ?? classification?.kind ?? "other",
        sentiment: body.sentiment ?? classification?.sentiment ?? null,
        title: body.title ?? classification?.title ?? null,
        message: body.message,
        agentClient: body.agentClient ?? null,
        agentModel: body.agentModel ?? null,
        toolVersion: body.toolVersion ?? null,
        userAgent: body.userAgent ?? userAgent ?? null,
        contextUrl: body.contextUrl ?? null,
        externalId: body.externalId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        metadata: body.metadata ?? null,
      })
      .onConflictDoNothing({
        target: [agentFeedback.organizationId, agentFeedback.idempotencyKey],
      })
      .returning()
  );

  if (created) {
    return {
      feedback: created,
      deduplicated: false,
    } satisfies SubmitFeedbackProgramSuccess;
  }

  const existing = idempotencyKey
    ? yield* findByIdempotencyKey(db, organizationId, idempotencyKey)
    : undefined;

  if (!existing) {
    return yield* new FeedbackNotFoundError();
  }

  return {
    feedback: existing,
    deduplicated: true,
  } satisfies SubmitFeedbackProgramSuccess;
});
