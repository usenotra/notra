import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { syncGscSuggestions } from "@notra/geo-core/geo/search-console";
import type { GscSyncResult } from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { and, eq, isNotNull } from "drizzle-orm";
import { Effect } from "effect";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function runGscSyncStep(
  organizationId: string
): Promise<GscSyncResult> {
  "use step";
  const startedAt = Date.now();
  const selectedProjects = await db.query.projects.findMany({
    columns: { id: true },
    where: and(
      eq(projects.organizationId, organizationId),
      isNotNull(projects.gscSiteUrl)
    ),
  });
  let keywords = 0;
  let suggestionsAdded = 0;
  let completed = 0;
  let failed = 0;
  // The shared OAuth integration row is a compare-and-swap sync lease.
  // Run projects in order so each call sees the previous sync's version.
  for (const project of selectedProjects) {
    try {
      const outcome = await Effect.runPromise(
        syncGscSuggestions(organizationId, project.id).pipe(
          Effect.provide(geoCoreDashboardLayer)
        )
      );
      if (outcome.status === "completed") {
        completed++;
        keywords += outcome.keywords ?? 0;
        suggestionsAdded += outcome.suggestionsAdded ?? 0;
      }
    } catch (error) {
      failed++;
      console.error(`[GSC] Failed to sync project ${project.id}:`, error);
    }
  }
  if (failed && !completed) {
    throw new Error("Search Console failed to sync all selected projects");
  }
  const result: GscSyncResult = completed
    ? { status: "completed", keywords, suggestionsAdded }
    : {
        status: "skipped",
        reason: selectedProjects.length
          ? "integration_changed"
          : "no_site_selected",
      };
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
