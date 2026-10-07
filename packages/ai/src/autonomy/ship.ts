import { db } from "@notra/db/drizzle";
import { autonomyOutbox, posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import {
  type IrisApproval,
  irisOutboxPayloadSchema,
} from "../schemas/autonomy/outbox";
import type {
  RecordIrisApprovalInput,
  RecordIrisApprovalResult,
  ShipIrisPostInput,
  ShipIrisPostResult,
} from "../types/autonomy-delivery";

export class IrisShipError extends Data.TaggedError("IrisShipError")<{
  readonly postId: string;
  readonly operation: string;
  readonly cause: unknown;
}> {}

export const recordIrisApproval = Effect.fn("iris.approval.record")(function* (
  input: RecordIrisApprovalInput
) {
  const result = yield* Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const rows = await tx
          .select({ payload: autonomyOutbox.payload })
          .from(autonomyOutbox)
          .where(
            and(
              eq(autonomyOutbox.id, input.outboxId),
              eq(autonomyOutbox.organizationId, input.organizationId)
            )
          )
          .limit(1)
          .for("update");

        const row = rows[0];
        if (!row) {
          const missing: RecordIrisApprovalResult = {
            recorded: false,
            existingAction: null,
            approvals: [],
          };
          return missing;
        }

        const parsed = irisOutboxPayloadSchema.safeParse(row.payload);
        if (!parsed.success) {
          const invalid: RecordIrisApprovalResult = {
            recorded: false,
            existingAction: null,
            approvals: [],
          };
          return invalid;
        }

        const knownPostIds = new Set(
          parsed.data.artifacts.map((artifact) => artifact.postId)
        );
        if (!knownPostIds.has(input.postId)) {
          const unknownArtifact: RecordIrisApprovalResult = {
            recorded: false,
            existingAction: null,
            approvals: parsed.data.approvals ?? [],
          };
          return unknownArtifact;
        }

        const approvals: readonly IrisApproval[] = parsed.data.approvals ?? [];

        const existing = approvals.find(
          (approval) => approval.postId === input.postId
        );
        if (existing) {
          const unchanged: RecordIrisApprovalResult = {
            recorded: false,
            existingAction: existing.action,
            approvals,
          };
          return unchanged;
        }

        const appended: readonly IrisApproval[] = [
          ...approvals,
          {
            postId: input.postId,
            action: input.action,
            slackUserId: input.slackUserId,
            slackUserName: input.slackUserName,
            at: new Date().toISOString(),
          },
        ];

        const basePayload =
          typeof row.payload === "object" &&
          row.payload !== null &&
          !Array.isArray(row.payload)
            ? row.payload
            : {};

        await tx
          .update(autonomyOutbox)
          .set({
            payload: { ...basePayload, approvals: appended },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(autonomyOutbox.id, input.outboxId),
              eq(autonomyOutbox.organizationId, input.organizationId)
            )
          );

        const recorded: RecordIrisApprovalResult = {
          recorded: true,
          existingAction: null,
          approvals: appended,
        };
        return recorded;
      }),
    catch: (cause) =>
      new IrisShipError({
        postId: input.postId,
        operation: "recordApproval",
        cause,
      }),
  });

  if (!result.recorded) {
    return result;
  }

  yield* Effect.logInfo("Iris approval recorded").pipe(
    Effect.annotateLogs({
      organizationId: input.organizationId,
      outboxId: input.outboxId,
      postId: input.postId,
      action: input.action,
      slackUserId: input.slackUserId,
    })
  );

  return result;
});

export const shipIrisPost = Effect.fn("iris.post.ship")(function* (
  input: ShipIrisPostInput
) {
  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          id: posts.id,
          title: posts.title,
          status: posts.status,
        })
        .from(posts)
        .where(
          and(
            eq(posts.id, input.postId),
            eq(posts.organizationId, input.organizationId)
          )
        )
        .limit(1),
    catch: (cause) =>
      new IrisShipError({
        postId: input.postId,
        operation: "loadPost",
        cause,
      }),
  });

  const post = rows[0];
  if (!post) {
    const missing: ShipIrisPostResult = {
      status: "not_found",
      postId: input.postId,
      title: null,
    };
    return missing;
  }

  if (post.status === "published") {
    const alreadyPublished: ShipIrisPostResult = {
      status: "already_published",
      postId: post.id,
      title: post.title,
    };
    return alreadyPublished;
  }

  const published = yield* Effect.tryPromise({
    try: () =>
      db
        .update(posts)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(posts.id, input.postId),
            eq(posts.organizationId, input.organizationId),
            eq(posts.status, "draft")
          )
        )
        .returning({ id: posts.id }),
    catch: (cause) =>
      new IrisShipError({
        postId: input.postId,
        operation: "publishPost",
        cause,
      }),
  });

  if (published.length === 0) {
    const raced: ShipIrisPostResult = {
      status: "already_published",
      postId: post.id,
      title: post.title,
    };
    return raced;
  }

  yield* Effect.logInfo("Iris post shipped from Slack").pipe(
    Effect.annotateLogs({
      organizationId: input.organizationId,
      postId: input.postId,
    })
  );

  const shipped: ShipIrisPostResult = {
    status: "shipped",
    postId: post.id,
    title: post.title,
  };
  return shipped;
});
