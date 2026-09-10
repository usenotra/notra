import { Effect } from "effect";

import type { GeoSkipFields } from "../types/geo";
import { logGeoSkip } from "../utils/geo-log";
import { GeoDatabaseError, GeoTinybirdError } from "./errors";

export function geoQuery<A>(
  label: string,
  run: () => Promise<A>
): Effect.Effect<A | null> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new GeoTinybirdError({ label, cause }),
  }).pipe(
    Effect.catch((error) => {
      console.error(`[GEO] ${error.label}:`, error.cause);
      return Effect.succeed(null);
    })
  );
}

export function geoSkip<A, E>(message: string, fields?: GeoSkipFields) {
  return <R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A | null, never, R> =>
    effect.pipe(
      Effect.catch((error) => {
        logGeoSkip(message, fields, error);
        return Effect.succeed(null);
      })
    );
}

export function geoDb<A>(
  label: string,
  run: () => Promise<A>
): Effect.Effect<A, GeoDatabaseError> {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new GeoDatabaseError({ label, cause }),
  });
}
