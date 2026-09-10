import type { GeoLogEvent } from "@notra/ai/types/evlog";
import { Effect, Exit } from "effect";

import { describeGeoCause, geoLogError, geoLogInfo } from "./geo-log";

export function withGeoTiming<A, E, R>(
  operation: Effect.Effect<A, E, R>,
  fields: GeoLogEvent
): Effect.Effect<A, E, R> {
  return Effect.suspend(() => {
    const startedAt = performance.now();
    return operation.pipe(
      Effect.onExit((exit) => {
        const event = {
          ...fields,
          durationMs: Math.round(performance.now() - startedAt),
        };
        return Exit.isSuccess(exit)
          ? geoLogInfo({ ...event, status: "success" })
          : geoLogError({
              ...event,
              status: "error",
              ...describeGeoCause(exit.cause),
            });
      })
    );
  });
}
