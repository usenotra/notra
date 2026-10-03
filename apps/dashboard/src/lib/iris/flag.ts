import {
  createServerFlagsManager,
  type ServerFlagsManager,
} from "@databuddy/sdk/node";
import { isDemoMode } from "@notra/utils/demo-mode";
import { Effect } from "effect";

import {
  IRIS_FLAG_CACHE_TTL_MS,
  IRIS_FLAG_ERROR_REASON,
  IRIS_FLAG_KEY,
  IRIS_FLAG_STALE_TIME_MS,
} from "@/constants/iris";
import { IrisFlagEvaluationError } from "@/lib/iris/errors";
import type { IrisFlagState } from "@/types/iris";

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
      cacheTtl: IRIS_FLAG_CACHE_TTL_MS,
      staleTime: IRIS_FLAG_STALE_TIME_MS,
      skipStorage: true,
    });
  }

  return cachedManager;
}

export function resolveIrisFlagState(
  organizationId: string
): Effect.Effect<IrisFlagState> {
  return Effect.gen(function* () {
    // The demo shows what a new workspace sees: flagged features stay off.
    if (isDemoMode()) {
      return "disabled";
    }
    if (process.env.NODE_ENV === "development") {
      return "enabled";
    }

    const manager = getFlagsManager();
    if (!manager) {
      return "disabled";
    }

    return yield* Effect.tryPromise({
      try: () =>
        manager.getFlag(IRIS_FLAG_KEY, {
          organizationId,
          properties: { organizationId },
        }),
      catch: (cause) =>
        new IrisFlagEvaluationError({
          message: "Failed to evaluate the Iris feature flag",
          cause,
        }),
    }).pipe(
      Effect.map((result): IrisFlagState => {
        if (result.reason === IRIS_FLAG_ERROR_REASON) {
          return "unavailable";
        }
        return result.enabled ? "enabled" : "disabled";
      }),
      Effect.catch(() => Effect.succeed<IrisFlagState>("unavailable"))
    );
  });
}

export function isIrisEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  return Effect.runPromise(
    resolveIrisFlagState(organizationId).pipe(
      Effect.map((state) => state === "enabled")
    )
  );
}
