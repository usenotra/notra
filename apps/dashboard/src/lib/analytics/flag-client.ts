import { Cache, Effect, Exit, Schema } from "effect";

import {
  ANALYTICS_FLAG_CACHE_CAPACITY,
  ANALYTICS_FLAG_CACHE_TTL_MS,
  ANALYTICS_FLAG_ERROR_REASON,
  ANALYTICS_FLAG_FAILURE_CACHE_TTL_MS,
  ANALYTICS_FLAG_REQUEST_TIMEOUT_MS,
  ANALYTICS_FLAGS_API_URL,
  MAX_PENDING_ANALYTICS_FLAG_EVALUATIONS,
  SOCIAL_ANALYTICS_FLAG_KEY,
} from "@/constants/analytics";
import { AnalyticsFlagEvaluationError } from "@/lib/analytics/errors";
import {
  analyticsFlagSchema,
  analyticsFlagsResponseSchema,
} from "@/schemas/analytics-flag";
import type { AnalyticsFlagState } from "@/types/analytics";

interface AnalyticsFlagEvaluation {
  readonly enabled: boolean;
  readonly reason?: string;
}

/**
 * Maps a decoded provider answer onto the surface state. Exported so tests can
 * assert the fail-closed mapping without a live Databuddy client.
 */
function mapAnalyticsFlagEvaluation(
  result: AnalyticsFlagEvaluation
): AnalyticsFlagState {
  if (result.reason === ANALYTICS_FLAG_ERROR_REASON) {
    return "unavailable";
  }
  return result.enabled ? "enabled" : "disabled";
}

/**
 * Bounds one evaluation and collapses every non-answer onto `unavailable`. A
 * timeout, an SDK rejection, and the provider's own error reason all mean "we
 * do not know", and the surface treats them identically.
 */
export function boundAnalyticsFlagEvaluation(
  evaluation: Effect.Effect<
    AnalyticsFlagEvaluation,
    AnalyticsFlagEvaluationError
  >
): Effect.Effect<AnalyticsFlagState> {
  return evaluation.pipe(
    Effect.timeout(ANALYTICS_FLAG_REQUEST_TIMEOUT_MS),
    Effect.map(mapAnalyticsFlagEvaluation),
    Effect.catch(() => Effect.succeed<AnalyticsFlagState>("unavailable"))
  );
}

const evaluateAnalyticsFlag = Effect.fn("evaluateAnalyticsFlag")(
  function* (clientId: string, organizationId: string) {
    const params = new URLSearchParams({
      clientId,
      organizationId,
      properties: JSON.stringify({ organizationId }),
      keys: SOCIAL_ANALYTICS_FLAG_KEY,
    });
    // Use the SDK's public endpoint directly: getFlag cannot accept a signal.
    // Keep body consumption inside tryPromise so timeout aborts that too.
    const json = yield* Effect.tryPromise({
      try: async (signal) => {
        const response = await fetch(`${ANALYTICS_FLAGS_API_URL}?${params}`, {
          signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Databuddy flag request failed: ${response.status}`);
        }
        return await response.json();
      },
      catch: (cause) =>
        new AnalyticsFlagEvaluationError({
          message: "Failed to evaluate the analytics feature flag",
          cause,
        }),
    });
    const response = yield* Schema.decodeUnknownEffect(
      analyticsFlagsResponseSchema
    )(json).pipe(
      Effect.mapError(
        (cause) =>
          new AnalyticsFlagEvaluationError({
            message: "Failed to evaluate the analytics feature flag",
            cause,
          })
      )
    );
    const entry = response.flags[SOCIAL_ANALYTICS_FLAG_KEY];
    if (entry === undefined) {
      return "disabled" as AnalyticsFlagState;
    }
    const result = yield* Schema.decodeUnknownEffect(analyticsFlagSchema)(
      entry
    ).pipe(
      Effect.mapError(
        (cause) =>
          new AnalyticsFlagEvaluationError({
            message: "Failed to evaluate the analytics feature flag",
            cause,
          })
      )
    );
    return mapAnalyticsFlagEvaluation(result);
  },
  Effect.timeout(ANALYTICS_FLAG_REQUEST_TIMEOUT_MS),
  Effect.catch(() => Effect.succeed<AnalyticsFlagState>("unavailable"))
);

export const makeAnalyticsFlagCache = Effect.fn("makeAnalyticsFlagCache")(
  function* (clientId: string) {
    let activeEvaluations = 0;
    return yield* Cache.makeWith(
      (organizationId: string) =>
        Effect.suspend(() => {
          if (activeEvaluations >= MAX_PENDING_ANALYTICS_FLAG_EVALUATIONS) {
            return Effect.succeed<AnalyticsFlagState>("unavailable");
          }
          activeEvaluations += 1;
          return evaluateAnalyticsFlag(clientId, organizationId).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                activeEvaluations -= 1;
              })
            )
          );
        }),
      {
        capacity: ANALYTICS_FLAG_CACHE_CAPACITY,
        timeToLive: (exit) =>
          Exit.isSuccess(exit) && exit.value !== "unavailable"
            ? ANALYTICS_FLAG_CACHE_TTL_MS
            : ANALYTICS_FLAG_FAILURE_CACHE_TTL_MS,
      }
    );
  }
);
