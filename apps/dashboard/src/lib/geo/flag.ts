import {
  createServerFlagsManager,
  type ServerFlagsManager,
} from "@databuddy/sdk/node";
import {
  GEO_FLAG_CACHE_TTL_MS,
  GEO_FLAG_ERROR_REASON,
  GEO_FLAG_STALE_TIME_MS,
} from "@notra/geo-core/constants/geo";
import { GeoFlagEvaluationError } from "@notra/geo-core/geo/errors";
import { isDemoMode } from "@notra/utils/demo-mode";
import { Effect } from "effect";

import type { GeoFlagState } from "@/types/geo";

const clientId = process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID ?? "";

let cachedManager: ServerFlagsManager | null = null;

function getFlagsManager(): ServerFlagsManager | null {
  if (clientId.length === 0) {
    return null;
  }

  if (!cachedManager) {
    cachedManager = createServerFlagsManager({
      clientId,
      autoFetch: false,
      cacheTtl: GEO_FLAG_CACHE_TTL_MS,
      staleTime: GEO_FLAG_STALE_TIME_MS,
      skipStorage: true,
    });
  }

  return cachedManager;
}

export function resolveGeoFlagState(
  flagKey: string,
  organizationId: string
): Effect.Effect<GeoFlagState> {
  return Effect.gen(function* () {
    const manager = getFlagsManager();
    // The demo shows what a new workspace sees: flagged features stay off.
    if (!manager || isDemoMode()) {
      return "disabled";
    }

    return yield* Effect.tryPromise({
      try: () =>
        manager.getFlag(flagKey, {
          organizationId,
          properties: { organizationId },
        }),
      catch: (cause) =>
        new GeoFlagEvaluationError({
          message: `Failed to evaluate the GEO feature flag "${flagKey}"`,
          cause,
        }),
    }).pipe(
      Effect.map((result): GeoFlagState => {
        if (result.reason === GEO_FLAG_ERROR_REASON) {
          return "unavailable";
        }
        return result.enabled ? "enabled" : "disabled";
      }),
      Effect.catch(() => Effect.succeed<GeoFlagState>("unavailable"))
    );
  });
}
