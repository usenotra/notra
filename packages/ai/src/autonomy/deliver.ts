import { db } from "@notra/db/drizzle";
import { autonomyOutbox, organizations } from "@notra/db/schema";
import { and, asc, eq, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { Duration, Effect, Schedule } from "effect";

import {
  SLACK_DELIVERY_ATTEMPT_TIMEOUT_SECONDS,
  SLACK_DELIVERY_BACKOFF_FACTOR,
  SLACK_DELIVERY_BASE_BACKOFF_SECONDS,
  SLACK_DELIVERY_BATCH_SIZE,
  SLACK_DELIVERY_INLINE_RETRY_ATTEMPTS,
  SLACK_DELIVERY_INLINE_RETRY_BASE_SECONDS,
  SLACK_DELIVERY_MAX_ATTEMPTS,
  SLACK_DELIVERY_MAX_BACKOFF_SECONDS,
} from "../constants/slack-delivery";
import { postSlackMessage } from "../integrations/slack-post";
import {
  type IrisOutboxPayload,
  IrisOutboxPayloadError,
  IrisOutboxPersistenceError,
  irisOutboxPayloadSchema,
} from "../schemas/autonomy/outbox";
import type { SlackDeliveryError } from "../schemas/slack-delivery";
import type {
  IrisDeliveryOutcome,
  IrisDeliverySummary,
  IrisOutboxRow,
} from "../types/autonomy-delivery";
import type { SlackMessageContent } from "../types/slack-delivery";
import { buildIrisNoOpBlocks, buildIrisRunBlocks } from "../utils/slack-blocks";

const MILLISECONDS_PER_SECOND = 1000;
const SLACK_DESTINATION = "slack";

const inlineBackoffSchedule: Schedule.Schedule<
  Duration.Duration,
  SlackDeliveryError
> = Schedule.exponential(
  Duration.seconds(SLACK_DELIVERY_INLINE_RETRY_BASE_SECONDS)
).pipe(Schedule.jittered);

const inlineRetrySchedule = Schedule.passthrough(inlineBackoffSchedule).pipe(
  Schedule.modifyDelay(({ input, duration }) =>
    Effect.succeed(
      Duration.max(
        duration,
        Duration.seconds(
          input._tag === "SlackDeliveryRetryableError"
            ? (input.retryAfterSeconds ?? 0)
            : 0
        )
      )
    )
  ),
  Schedule.upTo({ times: SLACK_DELIVERY_INLINE_RETRY_ATTEMPTS }),
  Schedule.while(({ input }) =>
    // Only short provider cooldowns fit the existing inline backoff budget.
    Effect.succeed(
      input._tag === "SlackDeliveryRetryableError" &&
        (input.retryAfterSeconds ?? 0) <=
          SLACK_DELIVERY_INLINE_RETRY_BASE_SECONDS
    )
  )
);

const loadOrganizationSlug = Effect.fn("iris.outbox.loadSlug")(function* (
  organizationId: string
) {
  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    catch: (cause) =>
      new IrisOutboxPersistenceError({
        outboxId: "",
        operation: "loadSlug",
        cause,
      }),
  }).pipe(Effect.catch(() => Effect.succeed<{ slug: string }[]>([])));

  return rows[0]?.slug ?? null;
});

const parsePayload = Effect.fn("iris.outbox.parsePayload")(function* (
  row: IrisOutboxRow
) {
  const parsed = irisOutboxPayloadSchema.safeParse(row.payload);
  if (!parsed.success) {
    return yield* Effect.fail(
      new IrisOutboxPayloadError({
        outboxId: row.id,
        issues: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      })
    );
  }
  return parsed.data;
});

const updateOutboxRow = Effect.fn("iris.outbox.update")(function* (input: {
  outboxId: string;
  attempts: number;
  operation: string;
  values: Partial<typeof autonomyOutbox.$inferInsert>;
}) {
  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .update(autonomyOutbox)
        .set({ ...input.values, updatedAt: new Date() })
        .where(
          and(
            eq(autonomyOutbox.id, input.outboxId),
            eq(autonomyOutbox.status, "attempting"),
            eq(autonomyOutbox.attempts, input.attempts)
          )
        )
        .returning({ id: autonomyOutbox.id }),
    catch: (cause) =>
      new IrisOutboxPersistenceError({
        outboxId: input.outboxId,
        operation: input.operation,
        cause,
      }),
  });
  return rows.length > 0;
});

function computeBackoffSeconds(
  attempts: number,
  retryAfterSeconds: number | null
): number {
  const exponent = Math.max(0, attempts - 1);
  const scheduled =
    SLACK_DELIVERY_BASE_BACKOFF_SECONDS *
    SLACK_DELIVERY_BACKOFF_FACTOR ** exponent;
  const bounded = Math.min(scheduled, SLACK_DELIVERY_MAX_BACKOFF_SECONDS);
  return Math.max(bounded, retryAfterSeconds ?? 0);
}

function buildMessageContent(
  payload: IrisOutboxPayload,
  row: IrisOutboxRow,
  organizationSlug: string | null
): SlackMessageContent {
  if (payload.kind === "no_op" || payload.artifacts.length === 0) {
    return buildIrisNoOpBlocks({
      headline: payload.headline,
      signalCount: payload.signalCount,
      trigger: payload.trigger,
    });
  }

  return buildIrisRunBlocks({
    organizationId: row.organizationId,
    organizationSlug: payload.organizationSlug ?? organizationSlug,
    outboxId: row.id,
    runId: payload.runId,
    headline: payload.headline,
    signalCount: payload.signalCount,
    trigger: payload.trigger,
    artifacts: payload.artifacts,
  });
}

const markFailed = Effect.fn("iris.outbox.markFailed")(function* (input: {
  row: IrisOutboxRow;
  attempts: number;
  lastError: string;
}) {
  const updated = yield* updateOutboxRow({
    outboxId: input.row.id,
    attempts: input.attempts,
    operation: "markFailed",
    values: {
      status: "failed",
      attempts: input.attempts,
      lastError: input.lastError,
      nextAttemptAt: null,
    },
  });

  if (!updated) {
    return {
      outboxId: input.row.id,
      status: "skipped",
      lastError: null,
      nextAttemptAt: null,
    } satisfies IrisDeliveryOutcome;
  }

  yield* Effect.logWarning("Iris outbox delivery failed").pipe(
    Effect.annotateLogs({
      outboxId: input.row.id,
      organizationId: input.row.organizationId,
      lastError: input.lastError,
    })
  );

  const outcome: IrisDeliveryOutcome = {
    outboxId: input.row.id,
    status: "failed",
    lastError: input.lastError,
    nextAttemptAt: null,
  };
  return outcome;
});

const markRetrying = Effect.fn("iris.outbox.markRetrying")(function* (input: {
  row: IrisOutboxRow;
  attempts: number;
  lastError: string;
  retryAfterSeconds: number | null;
}) {
  const nextAttemptAt = new Date(
    Date.now() +
      computeBackoffSeconds(input.attempts, input.retryAfterSeconds) *
        MILLISECONDS_PER_SECOND
  );

  const updated = yield* updateOutboxRow({
    outboxId: input.row.id,
    attempts: input.attempts,
    operation: "markRetrying",
    values: {
      status: "pending",
      attempts: input.attempts,
      lastError: input.lastError,
      nextAttemptAt,
    },
  });

  const outcome: IrisDeliveryOutcome = {
    outboxId: input.row.id,
    status: updated ? "pending" : "skipped",
    lastError: updated ? input.lastError : null,
    nextAttemptAt: updated ? nextAttemptAt : null,
  };
  return outcome;
});

const deliverableStatusFilter = (now: Date) =>
  or(
    eq(autonomyOutbox.status, "pending"),
    and(
      eq(autonomyOutbox.status, "attempting"),
      lt(
        autonomyOutbox.updatedAt,
        new Date(
          now.getTime() -
            SLACK_DELIVERY_ATTEMPT_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND
        )
      )
    )
  );

const claimOutboxRow = Effect.fn("iris.outbox.claim")(function* (input: {
  outboxId: string;
  attempts: number;
}) {
  const now = new Date();

  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .update(autonomyOutbox)
        .set({ status: "attempting", attempts: input.attempts, updatedAt: now })
        .where(
          and(
            eq(autonomyOutbox.id, input.outboxId),
            deliverableStatusFilter(now),
            eq(autonomyOutbox.attempts, input.attempts - 1),
            lt(autonomyOutbox.attempts, SLACK_DELIVERY_MAX_ATTEMPTS),
            or(
              isNull(autonomyOutbox.nextAttemptAt),
              lte(autonomyOutbox.nextAttemptAt, now)
            )
          )
        )
        .returning({ id: autonomyOutbox.id }),
    catch: (cause) =>
      new IrisOutboxPersistenceError({
        outboxId: input.outboxId,
        operation: "markAttempting",
        cause,
      }),
  });

  return rows.length > 0;
});

export const deliverOutboxMessage = Effect.fn("iris.outbox.deliver")(function* (
  row: IrisOutboxRow
) {
  const attempts = row.attempts + 1;

  const claimed = yield* claimOutboxRow({ outboxId: row.id, attempts });
  if (!claimed) {
    yield* Effect.logInfo("Iris outbox row was no longer deliverable").pipe(
      Effect.annotateLogs({
        outboxId: row.id,
        organizationId: row.organizationId,
      })
    );

    const skipped: IrisDeliveryOutcome = {
      outboxId: row.id,
      status: "skipped",
      lastError: null,
      nextAttemptAt: null,
    };
    return skipped;
  }

  const payloadResult = yield* Effect.result(parsePayload(row));
  if (payloadResult._tag === "Failure") {
    return yield* markFailed({
      row,
      attempts,
      lastError: `invalid_payload: ${payloadResult.failure.issues}`,
    });
  }

  const payload = payloadResult.success;
  const organizationSlug = yield* loadOrganizationSlug(row.organizationId);
  const content = buildMessageContent(payload, row, organizationSlug);

  const deliveryResult = yield* Effect.result(
    postSlackMessage({
      organizationId: row.organizationId,
      text: content.text,
      blocks: content.blocks,
    }).pipe(Effect.retry(inlineRetrySchedule))
  );

  if (deliveryResult._tag === "Success") {
    const delivered = deliveryResult.success;
    const payloadPatch = JSON.stringify({
      organizationSlug: payload.organizationSlug ?? organizationSlug,
      delivery:
        delivered.ts.length > 0
          ? {
              channel: delivered.channel,
              ts: delivered.ts,
              teamId: delivered.teamId,
              deliveredAt: new Date().toISOString(),
            }
          : null,
    });
    const updated = yield* Effect.tryPromise({
      try: () =>
        db
          .update(autonomyOutbox)
          .set({
            status: "delivered",
            attempts,
            lastError: null,
            nextAttemptAt: null,
            deliveredAt: new Date(),
            payload: sql`${autonomyOutbox.payload} || ${payloadPatch}::jsonb`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(autonomyOutbox.id, row.id),
              eq(autonomyOutbox.status, "attempting"),
              eq(autonomyOutbox.attempts, attempts)
            )
          )
          .returning({ id: autonomyOutbox.id }),
      catch: (cause) =>
        new IrisOutboxPersistenceError({
          outboxId: row.id,
          operation: "markDelivered",
          cause,
        }),
    });

    const outcome: IrisDeliveryOutcome = {
      outboxId: row.id,
      status: updated.length > 0 ? "delivered" : "skipped",
      lastError: null,
      nextAttemptAt: null,
    };
    return outcome;
  }

  const error = deliveryResult.failure;

  if (error._tag === "SlackDeliveryRetryableError") {
    if (attempts >= SLACK_DELIVERY_MAX_ATTEMPTS) {
      return yield* markFailed({
        row,
        attempts,
        lastError: `${error.code} (attempts exhausted)`,
      });
    }
    return yield* markRetrying({
      row,
      attempts,
      lastError: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }

  const lastError =
    error._tag === "SlackChannelNotConfiguredError"
      ? "channel_not_configured"
      : error.code;

  return yield* markFailed({ row, attempts, lastError });
});

const loadDeliverableRows = Effect.fn("iris.outbox.loadDeliverable")(function* (
  organizationId?: string
) {
  const now = new Date();
  const filters = [
    eq(autonomyOutbox.destination, SLACK_DESTINATION),
    deliverableStatusFilter(now),
    lt(autonomyOutbox.attempts, SLACK_DELIVERY_MAX_ATTEMPTS),
    or(
      isNull(autonomyOutbox.nextAttemptAt),
      lte(autonomyOutbox.nextAttemptAt, now)
    ),
  ];

  const where = organizationId
    ? and(...filters, eq(autonomyOutbox.organizationId, organizationId))
    : and(...filters);

  return yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          id: autonomyOutbox.id,
          organizationId: autonomyOutbox.organizationId,
          destination: autonomyOutbox.destination,
          attempts: autonomyOutbox.attempts,
          payload: autonomyOutbox.payload,
        })
        .from(autonomyOutbox)
        .where(where)
        .orderBy(asc(autonomyOutbox.createdAt))
        .limit(SLACK_DELIVERY_BATCH_SIZE),
    catch: (cause) =>
      new IrisOutboxPersistenceError({
        outboxId: "",
        operation: "loadDeliverable",
        cause,
      }),
  });
});

const failStrandedOutboxRows = Effect.fn("iris.outbox.failStranded")(function* (
  organizationId?: string
) {
  const now = new Date();
  const staleBefore = new Date(
    now.getTime() -
      SLACK_DELIVERY_ATTEMPT_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND
  );
  const filters = [
    eq(autonomyOutbox.destination, SLACK_DESTINATION),
    eq(autonomyOutbox.status, "attempting"),
    lt(autonomyOutbox.updatedAt, staleBefore),
    gte(autonomyOutbox.attempts, SLACK_DELIVERY_MAX_ATTEMPTS),
  ];

  const stranded = yield* Effect.tryPromise({
    try: () =>
      db
        .update(autonomyOutbox)
        .set({
          status: "failed",
          lastError: "delivery_timeout",
          updatedAt: now,
        })
        .where(
          organizationId
            ? and(...filters, eq(autonomyOutbox.organizationId, organizationId))
            : and(...filters)
        )
        .returning({ id: autonomyOutbox.id }),
    catch: (cause) =>
      new IrisOutboxPersistenceError({
        outboxId: "",
        operation: "failStranded",
        cause,
      }),
  });

  if (stranded.length > 0) {
    yield* Effect.annotateLogs(Effect.logWarning("iris.outbox.stranded"), {
      count: stranded.length,
    });
  }
});

export const deliverPendingOutbox = Effect.fn("iris.outbox.deliverPending")(
  function* (organizationId?: string) {
    yield* failStrandedOutboxRows(organizationId);
    const rows = yield* loadDeliverableRows(organizationId);
    const summary: IrisDeliverySummary = {
      processed: 0,
      delivered: 0,
      retrying: 0,
      failed: 0,
      skipped: 0,
    };

    for (const row of rows) {
      summary.processed += 1;
      const outcome = yield* Effect.result(deliverOutboxMessage(row));

      if (outcome._tag === "Failure") {
        summary.failed += 1;
        yield* Effect.logWarning(
          "Iris outbox delivery could not be recorded"
        ).pipe(
          Effect.annotateLogs({
            outboxId: row.id,
            organizationId: row.organizationId,
          })
        );
        continue;
      }

      const outcomeStatus = outcome.success.status;
      if (outcomeStatus === "delivered") {
        summary.delivered += 1;
        continue;
      }
      if (outcomeStatus === "pending") {
        summary.retrying += 1;
        continue;
      }
      if (outcomeStatus === "skipped") {
        summary.skipped += 1;
        continue;
      }
      summary.failed += 1;
    }

    return summary;
  }
);

export const loadIrisOutboxCard = Effect.fn("iris.outbox.loadCard")(
  function* (input: { organizationId: string; outboxId: string }) {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: autonomyOutbox.id,
            organizationId: autonomyOutbox.organizationId,
            destination: autonomyOutbox.destination,
            attempts: autonomyOutbox.attempts,
            payload: autonomyOutbox.payload,
          })
          .from(autonomyOutbox)
          .where(
            and(
              eq(autonomyOutbox.id, input.outboxId),
              eq(autonomyOutbox.organizationId, input.organizationId)
            )
          )
          .limit(1),
      catch: (cause) =>
        new IrisOutboxPersistenceError({
          outboxId: input.outboxId,
          operation: "loadCard",
          cause,
        }),
    });

    const row = rows[0];
    if (!row) {
      return null;
    }

    const parsed = irisOutboxPayloadSchema.safeParse(row.payload);
    if (!parsed.success) {
      return null;
    }

    const organizationSlug =
      parsed.data.organizationSlug ??
      (yield* loadOrganizationSlug(input.organizationId));

    return { row, payload: parsed.data, organizationSlug };
  }
);
