import { Cache, Duration, Effect, Exit } from "effect";

import { GeoFeatureFlagService } from "../deps";
import {
  GeoEngineFlagCacheKey,
  type GeoEngineFlags,
} from "../types/engine-flags";
import type { GeoFlagEvaluationError } from "./errors";

/**
 * Several GEO programs resolve the model catalog inside one server request, and
 * each resolution asks the flag provider the same two questions. A short-lived
 * cache keeps that to one round trip per organization without importing a
 * request cache into this package.
 */
const ENGINE_FLAG_CACHE_TTL = Duration.seconds(30);
const ENGINE_FLAG_CACHE_CAPACITY = 500;

/**
 * A provider outage is a degraded answer, not a failure: the engine stays
 * hidden (fail closed) so the catalog still resolves, and `available: false`
 * marks the answer as one that must not be cached.
 */
const evaluateFlag = (
  flag: Effect.Effect<boolean, GeoFlagEvaluationError>
): Effect.Effect<{ readonly enabled: boolean; readonly available: boolean }> =>
  flag.pipe(
    Effect.map((enabled) => ({ enabled, available: true })),
    Effect.catch(() => Effect.succeed({ enabled: false, available: false }))
  );

const evaluateGeoEngineFlags = Effect.fn("geo.engineFlags.evaluate")(
  function* ({ organizationId, featureFlags }: GeoEngineFlagCacheKey) {
    const [cursor, openCode] = yield* Effect.all(
      [
        evaluateFlag(
          featureFlags.isCursorEngineEnabledForOrganization(organizationId)
        ),
        evaluateFlag(
          featureFlags.isOpenCodeEngineEnabledForOrganization(organizationId)
        ),
      ],
      { concurrency: "unbounded" }
    );
    return {
      cursorEnabled: cursor.enabled,
      openCodeEnabled: openCode.enabled,
      available: cursor.available && openCode.available,
    } satisfies GeoEngineFlags;
  }
);

/**
 * `Cache` replaces a hand-rolled `Map` memo: it bounds itself, shares one
 * pending evaluation between callers sharing an organization and provider.
 * Provider identity is part of the key so distinct host layers cannot reuse
 * each other's evaluations.
 */
const engineFlagCache = Effect.runSync(
  Cache.makeWith(evaluateGeoEngineFlags, {
    capacity: ENGINE_FLAG_CACHE_CAPACITY,
    // Only answers the provider actually gave are held. A provider that fails,
    // defects, or is unavailable is retried by the next caller, exactly as the
    // previous memo did — a 30 s outage must not hide entitled engines for 30 s.
    timeToLive: (exit) =>
      Exit.isSuccess(exit) && exit.value.available
        ? ENGINE_FLAG_CACHE_TTL
        : Duration.zero,
  })
);

export const loadGeoEngineFlags = Effect.fn("geo.engineFlags")(function* (
  organizationId: string
) {
  const featureFlags = yield* GeoFeatureFlagService;
  return yield* Cache.get(
    engineFlagCache,
    new GeoEngineFlagCacheKey({ organizationId, featureFlags })
  );
});
