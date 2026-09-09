import {
  createServerFlagsManager,
  type ServerFlagsManager,
} from "@databuddy/sdk/node";
import { Effect } from "effect";

import {
  ANALYTICS_FLAG_CACHE_TTL_MS,
  ANALYTICS_FLAG_ERROR_REASON,
  ANALYTICS_FLAG_STALE_TIME_MS,
  SOCIAL_ANALYTICS_FLAG_KEY,
} from "@/constants/analytics";
import { AnalyticsFlagEvaluationError } from "@/lib/analytics/errors";
import type { AnalyticsFlagState } from "@/types/analytics";

const clientId = process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID ?? "";

/**
 * The Databuddy SDK exposes neither a timeout nor a `fetch` override, so the
 * evaluation is bounded here. A timeout resolves to `unavailable`, the same
 * state a failed evaluation produces.
 */
const ANALYTICS_FLAG_REQUEST_TIMEOUT_MS = 5000;
const MAX_PENDING_ANALYTICS_FLAG_EVALUATIONS = 500;

let cachedManager: ServerFlagsManager | null = null;
const pendingEvaluations = new Map<string, Promise<AnalyticsFlagEvaluation>>();

function getFlagsManager(): ServerFlagsManager | null {
  if (clientId.length === 0) {
    return null;
  }

  if (!cachedManager) {
    cachedManager = createServerFlagsManager({
      clientId,
      autoFetch: false,
      cacheTtl: ANALYTICS_FLAG_CACHE_TTL_MS,
      staleTime: ANALYTICS_FLAG_STALE_TIME_MS,
      skipStorage: true,
    });
  }

  return cachedManager;
}

interface AnalyticsFlagEvaluation {
  readonly enabled: boolean;
  readonly reason?: string;
}

export function deduplicatePendingAnalyticsFlagEvaluation(
  organizationId: string,
  evaluate: () => Promise<AnalyticsFlagEvaluation>
): Promise<AnalyticsFlagEvaluation> {
  const existing = pendingEvaluations.get(organizationId);
  if (existing) {
    return existing;
  }

  if (pendingEvaluations.size >= MAX_PENDING_ANALYTICS_FLAG_EVALUATIONS) {
    return Promise.resolve({
      enabled: false,
      reason: ANALYTICS_FLAG_ERROR_REASON,
    });
  }

  const evaluation = evaluate();
  pendingEvaluations.set(organizationId, evaluation);
  void evaluation.then(
    () => pendingEvaluations.delete(organizationId),
    () => pendingEvaluations.delete(organizationId)
  );
  return evaluation;
}

/**
 * Bounds one evaluation and collapses every non-answer onto `unavailable`: a
 * timeout, an SDK rejection, and the provider's own error reason all mean "we
 * do not know", and the surface treats them identically. Exported so that
 * equivalence can be asserted without a live Databuddy client.
 */
export function boundAnalyticsFlagEvaluation(
  evaluate: Effect.Effect<AnalyticsFlagEvaluation, AnalyticsFlagEvaluationError>
): Effect.Effect<AnalyticsFlagState> {
  return evaluate.pipe(
    Effect.timeout(ANALYTICS_FLAG_REQUEST_TIMEOUT_MS),
    Effect.map((result): AnalyticsFlagState => {
      if (result.reason === ANALYTICS_FLAG_ERROR_REASON) {
        return "unavailable";
      }
      return result.enabled ? "enabled" : "disabled";
    }),
    Effect.catch(() => Effect.succeed<AnalyticsFlagState>("unavailable"))
  );
}

function resolveAnalyticsFlagState(
  organizationId: string
): Effect.Effect<AnalyticsFlagState> {
  return Effect.gen(function* () {
    if (process.env.NODE_ENV === "development") {
      return "enabled";
    }

    const manager = getFlagsManager();
    if (!manager) {
      return "disabled";
    }

    return yield* boundAnalyticsFlagEvaluation(
      Effect.tryPromise({
        // The SDK has no AbortSignal API. Keep the uncancellable promise
        // shared until it settles so callers after a timeout do not create an
        // unbounded pile of duplicate provider requests.
        try: () =>
          deduplicatePendingAnalyticsFlagEvaluation(organizationId, () =>
            manager.getFlag(SOCIAL_ANALYTICS_FLAG_KEY, {
              organizationId,
              properties: { organizationId },
            })
          ),
        catch: (cause) =>
          new AnalyticsFlagEvaluationError({
            message: "Failed to evaluate the analytics feature flag",
            cause,
          }),
      })
    );
  });
}

export function isAnalyticsEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  return Effect.runPromise(
    resolveAnalyticsFlagState(organizationId).pipe(
      Effect.map((state) => state === "enabled")
    )
  );
}
