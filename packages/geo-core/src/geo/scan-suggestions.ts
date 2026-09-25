import { db } from "@notra/db/drizzle";
import {
  geoMentionChecks,
  geoPrompts,
  geoPromptSuggestions,
  geoScans,
  geoSettings,
} from "@notra/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { Effect } from "effect";

import {
  SCAN_SUGGESTION_CHECK_LIMIT,
  SCAN_SUGGESTION_LIMIT,
  SCAN_SUGGESTION_LOOKBACK_DAYS,
} from "../constants/scan-suggestions";
import type { GeoScopeInput } from "../types/geo";
import {
  collectScanSuggestions,
  mergeScanEvidence,
  scanQueryKey,
} from "../utils/scan-suggestions";
import { geoDb } from "./effect";
import { lockGeoProjectInTransaction } from "./lock";
import { requireGeoProject } from "./projects";
import { buildBrandTerms } from "./suggestion-keywords";

export const refreshScanSuggestions = Effect.fn("geo.suggestions.fromScans")(
  function* (input: GeoScopeInput) {
    const { projectId } = yield* requireGeoProject(input);
    return yield* geoDb("refresh scan suggestions", () =>
      db.transaction(async (tx) => {
        await lockGeoProjectInTransaction(tx, projectId);
        const checks = await tx
          .select({ check: geoMentionChecks })
          .from(geoMentionChecks)
          .innerJoin(geoScans, eq(geoScans.id, geoMentionChecks.scanId))
          .where(
            and(
              eq(geoMentionChecks.organizationId, input.organizationId),
              eq(geoMentionChecks.projectId, projectId),
              eq(geoScans.organizationId, input.organizationId),
              eq(geoScans.projectId, projectId),
              eq(geoScans.status, "completed"),
              gte(
                geoMentionChecks.capturedAt,
                new Date(
                  Date.now() - SCAN_SUGGESTION_LOOKBACK_DAYS * 86_400_000
                )
              )
            )
          )
          .orderBy(desc(geoMentionChecks.capturedAt), geoMentionChecks.id)
          .limit(SCAN_SUGGESTION_CHECK_LIMIT);
        const tracked = await tx.query.geoPrompts.findMany({
          where: and(
            eq(geoPrompts.organizationId, input.organizationId),
            eq(geoPrompts.projectId, projectId)
          ),
        });
        const existing = await tx.query.geoPromptSuggestions.findMany({
          where: and(
            eq(geoPromptSuggestions.organizationId, input.organizationId),
            eq(geoPromptSuggestions.projectId, projectId)
          ),
        });
        const settings = await tx.query.geoSettings.findFirst({
          where: and(
            eq(geoSettings.organizationId, input.organizationId),
            eq(geoSettings.projectId, projectId)
          ),
        });
        const candidates = collectScanSuggestions(
          checks.map(({ check }) => check),
          [
            ...tracked.map((row) => row.prompt),
            ...existing
              .filter(
                (row) => row.source !== "scan" || row.status !== "pending"
              )
              .map((row) => row.prompt),
          ],
          buildBrandTerms(settings)
        );
        const byKey = new Map(
          existing.map((row) => [scanQueryKey(row.prompt), row])
        );
        let pendingCount = existing.filter(
          (row) => row.source === "scan" && row.status === "pending"
        ).length;
        let inserted = 0;
        for (const candidate of candidates) {
          const previous = byKey.get(scanQueryKey(candidate.prompt));
          if (previous) {
            if (previous.source === "scan" && previous.status === "pending") {
              await tx
                .update(geoPromptSuggestions)
                .set({
                  scanEvidence: mergeScanEvidence([
                    ...previous.scanEvidence,
                    ...candidate.evidence,
                  ]),
                })
                .where(
                  and(
                    eq(geoPromptSuggestions.id, previous.id),
                    eq(
                      geoPromptSuggestions.organizationId,
                      input.organizationId
                    ),
                    eq(geoPromptSuggestions.projectId, projectId),
                    eq(geoPromptSuggestions.status, "pending")
                  )
                );
            }
            continue;
          }
          if (pendingCount >= SCAN_SUGGESTION_LIMIT) {
            continue;
          }
          const rows = await tx
            .insert(geoPromptSuggestions)
            .values({
              id: crypto.randomUUID(),
              organizationId: input.organizationId,
              projectId,
              prompt: candidate.prompt,
              source: "scan",
              sourceKeywords: [],
              scanEvidence: candidate.evidence,
            })
            .onConflictDoNothing()
            .returning({ id: geoPromptSuggestions.id });
          inserted += rows.length;
          pendingCount += rows.length;
        }
        return { inserted };
      })
    );
  }
);
