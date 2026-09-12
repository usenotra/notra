import { syncGscSuggestions } from "@notra/geo-core/geo/search-console";
import type { GscSyncResult } from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Effect } from "effect";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function runGscSyncStep(
  organizationId: string
): Promise<GscSyncResult> {
  "use step";
  const startedAt = Date.now();
  const result = await Effect.runPromise(
    syncGscSuggestions(organizationId).pipe(
      Effect.provide(geoCoreDashboardLayer)
    )
  );
  await trackServerEventAndFlush({
    organizationId,
    event: POSTHOG_EVENTS.GSC_SYNC_COMPLETED,
    properties: {
      status: result.status,
      reason: result.reason ?? null,
      keywords: result.status === "completed" ? result.keywords : 0,
      suggestions_created:
        result.status === "completed" ? result.suggestionsAdded : 0,
      duration_ms: Date.now() - startedAt,
    },
  });
  return result;
}
