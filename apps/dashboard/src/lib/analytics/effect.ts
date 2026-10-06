import { logError } from "@notra/ai/utils/server-log";
import { Effect } from "effect";

import {
  AnalyticsDatabaseError,
  AnalyticsRequestError,
  AnalyticsTinybirdError,
} from "@/lib/analytics/errors";

export function analyticsQuery<A>(
  label: string,
  run: () => Promise<A>
): Effect.Effect<A | null> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new AnalyticsTinybirdError({ label, cause }),
  }).pipe(
    Effect.catch((error) => {
      logError("[Analytics] Request failed", error.cause, {
        label: error.label,
      });
      return Effect.succeed(null);
    })
  );
}

export function analyticsDb<A>(
  label: string,
  run: () => Promise<A>
): Effect.Effect<A, AnalyticsDatabaseError> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new AnalyticsDatabaseError({ label, cause }),
  });
}

export function analyticsRequest<A>(
  label: string,
  run: () => Promise<A>
): Effect.Effect<A, AnalyticsRequestError> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new AnalyticsRequestError({ label, cause }),
  });
}

export function analyticsSideEffect(
  label: string,
  run: () => Promise<unknown>
): Effect.Effect<void> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new AnalyticsRequestError({ label, cause }),
  }).pipe(
    Effect.map(() => undefined),
    Effect.catch((error) => {
      logError("[Analytics] Request failed", error.cause, {
        label: error.label,
      });
      return Effect.succeed(undefined);
    })
  );
}
