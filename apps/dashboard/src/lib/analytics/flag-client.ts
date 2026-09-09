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
import { analyticsFlagsResponseSchema } from "@/schemas/analytics-flag";
import type { AnalyticsFlagState } from "@/types/analytics";

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
    )(json);
    const result = response.flags[SOCIAL_ANALYTICS_FLAG_KEY];
    if (result?.reason === ANALYTICS_FLAG_ERROR_REASON) {
      return "unavailable";
    }
    return result?.enabled ? "enabled" : "disabled";
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
