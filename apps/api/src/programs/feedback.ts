import { classifyAgentFeedback } from "@notra/ai/jobs/feedback-classifier";
import { agentFeedback, projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { nanoid } from "nanoid";

import {
  FeedbackDatabaseError,
  FeedbackNotFoundError,
  FeedbackProjectNotFoundError,
} from "../errors/feedback";
import type {
  SubmitFeedbackProgramInput,
  SubmitFeedbackProgramSuccess,
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

export const submitFeedback = Effect.fn("feedback.submit")(function* ({
  db,
  organizationId,
  body,
  ingestProjectId,
  userAgent,
}: SubmitFeedbackProgramInput) {
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

  const idempotencyKey = body.idempotencyKey;
  const existing = idempotencyKey
    ? yield* database(() =>
        db.query.agentFeedback.findFirst({
          where: and(
            eq(agentFeedback.organizationId, organizationId),
            eq(agentFeedback.idempotencyKey, idempotencyKey)
          ),
        })
      )
    : undefined;

  if (!existing) {
    return yield* new FeedbackNotFoundError();
  }

  return {
    feedback: existing,
    deduplicated: true,
  } satisfies SubmitFeedbackProgramSuccess;
});
