import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { contentTriggers, members, organizations } from "@notra/db/schema";
import { getResend } from "@notra/email/utils/resend";
import {
  type AutomatedWorkflowFailureState,
  automatedWorkflowFailureStateSchema,
} from "@notra/schemas/dashboard/workflows";
import { and, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import {
  AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD,
  AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS,
} from "@/constants/workflows";
import { sendWorkflowPausedEmail } from "@/lib/email/send";
import type {
  AutomatedWorkflowPauseReason,
  ClearAutomatedWorkflowPauseStateParams,
  RecordAutomatedWorkflowPauseParams,
} from "@/types/workflows/auto-pause";

class AutomatedWorkflowFailureStateError extends Data.TaggedError(
  "AutomatedWorkflowFailureStateError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

function getFailureStateKey(
  triggerId: string,
  reason: AutomatedWorkflowPauseReason
) {
  return `workflow:auto-pause:${triggerId}:${reason}:state`;
}

function getFailureCountKey(
  triggerId: string,
  reason: AutomatedWorkflowPauseReason
) {
  return `workflow:auto-pause:${triggerId}:${reason}:count`;
}

function getFailureStateKeys(triggerId: string) {
  return [
    getFailureCountKey(triggerId, "ai_credits_depleted"),
    getFailureStateKey(triggerId, "ai_credits_depleted"),
    getFailureCountKey(triggerId, "plan_limit_reached"),
    getFailureStateKey(triggerId, "plan_limit_reached"),
    getFailureCountKey(triggerId, "workflow_errors"),
    getFailureStateKey(triggerId, "workflow_errors"),
  ];
}

function parseFailureState(rawState: string | null) {
  if (!rawState) {
    return null;
  }

  try {
    const parsedJson: unknown = JSON.parse(rawState);
    const parsedState =
      automatedWorkflowFailureStateSchema.safeParse(parsedJson);

    return parsedState.success ? parsedState.data : null;
  } catch {
    return null;
  }
}

function buildNextState(
  previousState: AutomatedWorkflowFailureState | null,
  failedAt: Date
): AutomatedWorkflowFailureState {
  const failedAtIso = failedAt.toISOString();

  return {
    count: (previousState?.count ?? 0) + 1,
    firstFailedAt: previousState?.firstFailedAt ?? failedAtIso,
    lastFailedAt: failedAtIso,
  };
}

async function sendPausedEmails({
  organizationId,
  automationName,
  reason,
  logPrefix,
}: RecordAutomatedWorkflowPauseParams) {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[${logPrefix}] Resend not configured, skipping workflow paused email`
    );
    return;
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { name: true, slug: true },
  });

  const ownerMemberships = await db.query.members.findMany({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.role, "owner")
    ),
    with: { users: { columns: { email: true } } },
  });

  const organizationName = org?.name ?? "Your organization";
  const organizationSlug = org?.slug ?? "";
  const ownerEmails = ownerMemberships.map((m) => m.users.email);
  const pauseEventId = crypto.randomUUID();

  for (const recipientEmail of ownerEmails) {
    const result = await sendWorkflowPausedEmail(resend, {
      recipientEmail,
      organizationName,
      organizationSlug,
      automationName,
      reason,
      pauseEventId,
    });

    if (result.error) {
      console.error(
        `[${logPrefix}] Failed to send workflow paused email to ${recipientEmail}:`,
        result.error
      );
    }
  }
}

const recordAutomatedWorkflowFailure = Effect.fn(
  "recordAutomatedWorkflowFailure"
)(function* (params: RecordAutomatedWorkflowPauseParams) {
  const redisClient = redis;

  if (!redisClient) {
    yield* Effect.logWarning(
      `[${params.logPrefix}] Redis not configured, skipping automated workflow failure tracking`
    );
    return { paused: false, failureCount: 0 };
  }

  const failedAt = new Date();
  const failureCountKey = getFailureCountKey(params.triggerId, params.reason);
  const failureStateKey = getFailureStateKey(params.triggerId, params.reason);
  const failureCount = yield* Effect.tryPromise({
    try: () => redisClient.incr(failureCountKey),
    catch: (cause) =>
      new AutomatedWorkflowFailureStateError({
        message: "Failed to increment automated workflow failure state",
        cause,
      }),
  });
  const previousRawState = yield* Effect.tryPromise({
    try: () => redisClient.get<string>(failureStateKey),
    catch: () => Promise.resolve(null),
  });
  const nextState = {
    ...buildNextState(parseFailureState(previousRawState), failedAt),
    count: failureCount,
  };

  yield* Effect.tryPromise({
    try: async () => {
      const pipeline = redisClient.pipeline();
      pipeline.expire(
        failureCountKey,
        AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS
      );
      pipeline.set(failureStateKey, JSON.stringify(nextState), {
        ex: AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS,
      });
      await pipeline.exec();
    },
    catch: (cause) =>
      new AutomatedWorkflowFailureStateError({
        message: "Failed to store automated workflow failure state",
        cause,
      }),
  });

  if (failureCount < AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD) {
    return { paused: false, failureCount };
  }

  const pausedTriggers = yield* Effect.tryPromise({
    try: () =>
      db
        .update(contentTriggers)
        .set({ enabled: false })
        .where(
          and(
            eq(contentTriggers.id, params.triggerId),
            eq(contentTriggers.organizationId, params.organizationId),
            eq(contentTriggers.enabled, true)
          )
        )
        .returning({ id: contentTriggers.id }),
    catch: (cause) =>
      new AutomatedWorkflowFailureStateError({
        message: "Failed to pause automated workflow",
        cause,
      }),
  });

  if (pausedTriggers.length > 0) {
    yield* Effect.tryPromise({
      try: () => sendPausedEmails(params),
      catch: (cause) =>
        new AutomatedWorkflowFailureStateError({
          message: "Failed to send workflow paused notification",
          cause,
        }),
    });
  }

  yield* Effect.tryPromise({
    try: () => redisClient.del(...getFailureStateKeys(params.triggerId)),
    catch: (cause) =>
      new AutomatedWorkflowFailureStateError({
        message: "Failed to clear automated workflow failure state",
        cause,
      }),
  });

  return { paused: pausedTriggers.length > 0, failureCount };
});

const clearAutomatedWorkflowFailures = Effect.fn(
  "clearAutomatedWorkflowFailures"
)(function* ({ triggerId }: ClearAutomatedWorkflowPauseStateParams) {
  const redisClient = redis;

  if (!redisClient) {
    return;
  }

  yield* Effect.tryPromise({
    try: () => redisClient.del(...getFailureStateKeys(triggerId)),
    catch: (cause) =>
      new AutomatedWorkflowFailureStateError({
        message: "Failed to clear automated workflow failure state",
        cause,
      }),
  });
});

export async function recordAutomatedWorkflowPauseSafe(
  params: RecordAutomatedWorkflowPauseParams
) {
  try {
    const pauseResult = await Effect.runPromise(
      recordAutomatedWorkflowFailure(params)
    );

    if (pauseResult.paused) {
      console.warn(
        `[${params.logPrefix}] Paused trigger ${params.triggerId} after ${pauseResult.failureCount} automated ${params.reason} events`
      );
    }
  } catch (error) {
    console.warn(
      `[${params.logPrefix}] Failed to record automated workflow pause state`,
      { triggerId: params.triggerId, reason: params.reason, error }
    );
  }
}

export async function clearAutomatedWorkflowPauseSafe({
  triggerId,
  logPrefix,
}: ClearAutomatedWorkflowPauseStateParams & { logPrefix: string }) {
  try {
    await Effect.runPromise(clearAutomatedWorkflowFailures({ triggerId }));
  } catch (error) {
    console.warn(
      `[${logPrefix}] Failed to clear automated workflow pause state`,
      { triggerId, error }
    );
  }
}
