import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { syncGscSuggestions } from "@notra/geo-core/geo/search-console";
import type { GscSyncResult } from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { and, eq, isNotNull } from "drizzle-orm";
import { Effect } from "effect";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function listGscSyncProjectsStep(organizationId: string) {
  "use step";
  const startedAt = Date.now();
  const selectedProjects = await db.query.projects.findMany({
    columns: { id: true },
    where: and(
      eq(projects.organizationId, organizationId),
      isNotNull(projects.gscSiteUrl)
    ),
  });
  return {
    projectIds: selectedProjects.map((project) => project.id),
    startedAt,
  };
}

export async function runGscProjectSyncStep(
  organizationId: string,
  projectId: string
): Promise<GscSyncResult> {
  "use step";
  return await Effect.runPromise(
    syncGscSuggestions(organizationId, projectId).pipe(
      Effect.provide(geoCoreDashboardLayer)
    )
  );
}

export async function trackGscSyncStep(
  organizationId: string,
  result: GscSyncResult,
  startedAt: number
) {
  "use step";
  await trackServerEventAndFlush({
    organizationId,
    event: POSTHOG_EVENTS.GSC_SYNC_COMPLETED,
    properties: {
      status: result.status,
      reason: result.reason ?? null,
      keywords: result.keywords ?? 0,
      suggestions_created: result.suggestionsAdded ?? 0,
      duration_ms: Date.now() - startedAt,
    },
  });
}
