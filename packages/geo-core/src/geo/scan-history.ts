import { db } from "@notra/db/drizzle";
import { geoMentionChecks, geoScans } from "@notra/db/schema";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_SCAN_RESULTS_PAGE_SIZE,
  GEO_SCAN_RUNS_PAGE_SIZE,
} from "../constants/geo-scan-history";
import type {
  GeoScanRunInput,
  GeoScanRunsInput,
  GeoScanRunSummary,
} from "../types/geo-scan-history";
import { geoScanAnswerKey } from "../utils/geo-scan-plan";
import { geoDb } from "./effect";
import { requireGeoProject } from "./projects";
import { sweepStaleGeoScanRows } from "./scan-status";

export const loadGeoScanRuns = Effect.fn("geo.scanRuns")(function* (
  input: GeoScanRunsInput
) {
  const scope = yield* requireGeoProject(input);
  yield* sweepStaleGeoScanRows(scope);
  const rows = yield* geoDb("scan history lookup failed", () =>
    db.query.geoScans.findMany({
      columns: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        plan: true,
      },
      where: and(
        eq(geoScans.organizationId, scope.organizationId),
        eq(geoScans.projectId, scope.projectId)
      ),
      orderBy: [desc(geoScans.startedAt), desc(geoScans.id)],
      limit: GEO_SCAN_RUNS_PAGE_SIZE + 1,
      offset: input.offset,
    })
  );
  const page = rows.slice(0, GEO_SCAN_RUNS_PAGE_SIZE);
  const counts =
    page.length === 0
      ? []
      : yield* geoDb("scan counts lookup failed", () =>
          db
            .select({
              scanId: geoMentionChecks.scanId,
              checks: count(),
              mentions:
                sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})`.mapWith(
                  Number
                ),
            })
            .from(geoMentionChecks)
            .where(
              and(
                eq(geoMentionChecks.organizationId, scope.organizationId),
                eq(geoMentionChecks.projectId, scope.projectId),
                inArray(
                  geoMentionChecks.scanId,
                  page.map((row) => row.id)
                )
              )
            )
            .groupBy(geoMentionChecks.scanId)
        );
  const countsByScan = new Map(counts.map((row) => [row.scanId, row]));
  const runs: GeoScanRunSummary[] = page.map((row) => ({
    ...row,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    checks: countsByScan.get(row.id)?.checks ?? 0,
    mentions: countsByScan.get(row.id)?.mentions ?? 0,
  }));
  return { runs, hasMore: rows.length > GEO_SCAN_RUNS_PAGE_SIZE };
});

export const loadGeoScanRun = Effect.fn("geo.scanRun")(function* (
  input: GeoScanRunInput
) {
  const scope = yield* requireGeoProject(input);
  yield* sweepStaleGeoScanRows(scope);
  const scan = yield* geoDb("scan lookup failed", () =>
    db.query.geoScans.findFirst({
      columns: { id: true, status: true, plan: true },
      where: and(
        eq(geoScans.id, input.scanId),
        eq(geoScans.organizationId, scope.organizationId),
        eq(geoScans.projectId, scope.projectId)
      ),
    })
  );
  if (!scan) {
    return null;
  }

  const scopeFilter = and(
    eq(geoMentionChecks.scanId, scan.id),
    eq(geoMentionChecks.organizationId, scope.organizationId),
    eq(geoMentionChecks.projectId, scope.projectId)
  );
  const resultFilter = and(
    scopeFilter,
    input.engine ? eq(geoMentionChecks.engine, input.engine) : undefined
  );
  const [results, totals, sources] = yield* geoDb(
    "scan results lookup failed",
    () =>
      Promise.all([
        db
          .select({
            id: geoMentionChecks.id,
            prompt: geoMentionChecks.prompt,
            engine: geoMentionChecks.engine,
            mentioned: geoMentionChecks.mentioned,
            position: geoMentionChecks.position,
            language: geoMentionChecks.language,
            turn: geoMentionChecks.turn,
            sequenceId: geoMentionChecks.sequenceId,
            sources:
              sql<number>`jsonb_array_length(${geoMentionChecks.sources})`.mapWith(
                Number
              ),
            capturedAt: geoMentionChecks.capturedAt,
          })
          .from(geoMentionChecks)
          .where(resultFilter)
          .orderBy(asc(geoMentionChecks.createdAt), asc(geoMentionChecks.id))
          .limit(GEO_SCAN_RESULTS_PAGE_SIZE)
          .offset(input.offset),
        db
          .select({ count: count() })
          .from(geoMentionChecks)
          .where(resultFilter),
        db
          .select({
            count: sql<number>`count(distinct source.value->>'url')`.mapWith(
              Number
            ),
          })
          .from(geoMentionChecks)
          .crossJoin(
            sql`jsonb_array_elements(${geoMentionChecks.sources}) as source(value)`
          )
          .where(scopeFilter),
      ])
  );
  const saved = scan.plan?.tasks?.length
    ? yield* geoDb("saved scan tasks lookup failed", () =>
        db
          .select({
            promptId: geoMentionChecks.promptId,
            engine: geoMentionChecks.engine,
            language: geoMentionChecks.language,
            turn: geoMentionChecks.turn,
          })
          .from(geoMentionChecks)
          .where(scopeFilter)
      )
    : [];
  const savedKeys = new Set(
    saved.map((row) =>
      geoScanAnswerKey(row.promptId, row.engine, row.language, row.turn)
    )
  );
  const pending = (scan.plan?.tasks ?? [])
    .filter(
      (task) =>
        !savedKeys.has(task.key) &&
        (!input.engine || task.engine === input.engine)
    )
    .map((task) => ({
      ...task,
      status:
        scan.status === "running"
          ? (scan.plan?.taskStates?.[task.key] ?? "queued")
          : "failed",
    }));
  const pendingOffset = Math.min(
    input.pendingOffset ?? 0,
    Math.max(0, Math.ceil(pending.length / GEO_SCAN_RESULTS_PAGE_SIZE) - 1) *
      GEO_SCAN_RESULTS_PAGE_SIZE
  );
  return {
    status: scan.status,
    pendingOffset,
    pending: pending.slice(
      pendingOffset,
      pendingOffset + GEO_SCAN_RESULTS_PAGE_SIZE
    ),
    pendingTotal: pending.length,
    results: results.map((row) => ({
      ...row,
      capturedAt: row.capturedAt.toISOString(),
    })),
    total: totals[0]?.count ?? 0,
    uniqueSources: sources[0]?.count ?? 0,
  };
});
