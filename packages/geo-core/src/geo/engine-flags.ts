import { Cache, Duration, Effect, Exit } from "effect";

import { GeoFeatureFlagService } from "../deps";
import {
  GeoEngineFlagCacheKey,
  type GeoEngineFlags,
} from "../types/engine-flags";

/**
 * Several GEO programs resolve the model catalog inside one server request, and
 * each resolution asks the flag provider the same two questions. A short-lived
 * cache keeps that to one round trip per organization without importing a
 * request cache into this package.
 */
const ENGINE_FLAG_CACHE_TTL = Duration.seconds(30);
const ENGINE_FLAG_CACHE_CAPACITY = 500;

const evaluateGeoEngineFlags = Effect.fn("geo.engineFlags.evaluate")(
  function* ({ organizationId, featureFlags }: GeoEngineFlagCacheKey) {
    const [cursorEnabled, openCodeEnabled] = yield* Effect.all(
      [
        featureFlags.isCursorEngineEnabledForOrganization(organizationId),
        featureFlags.isOpenCodeEngineEnabledForOrganization(organizationId),
      ],
      { concurrency: "unbounded" }
    );
    return { cursorEnabled, openCodeEnabled } satisfies GeoEngineFlags;
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
    // Only resolved evaluations are held. A provider that fails or defects is
    // retried by the next caller, exactly as the previous memo did.
    timeToLive: (exit) =>
      Exit.isSuccess(exit) ? ENGINE_FLAG_CACHE_TTL : Duration.zero,
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
