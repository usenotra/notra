import {
  isTinybirdConfigured,
  queryGeoJourneyDetail,
  queryGeoTrafficJourneys,
  queryGeoTrafficLog,
  queryGeoTrafficOverview,
  queryGeoTrafficPages,
  queryGeoTrafficTimeseries,
} from "@notra/analytics/tinybird/client";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoCompetitors,
  geoPrompts,
  geoSettings,
} from "@notra/db/schema";
import {
  queryGeoCheckCompetitorPrompts,
  queryGeoCheckCompetitorShare,
  queryGeoCheckCompetitorShareTimeseries,
  queryGeoCheckCompetitorShareTrends,
  queryGeoCheckCompetitorTimeseries,
  queryGeoCheckLanguageShare,
  queryGeoCheckLanguageShareTrends,
  queryGeoCheckOverview,
  queryGeoCheckPromptHistory,
  queryGeoCheckPromptResults,
  queryGeoScanComparison,
  queryGeoCheckTimeseries,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  AI_TRAFFIC_DEFAULT_DAYS,
  AI_TRAFFIC_DEFAULT_JOURNEYS_LIMIT,
  AI_TRAFFIC_DEFAULT_LOG_LIMIT,
  AI_TRAFFIC_DEFAULT_PAGES_LIMIT,
  AI_TRAFFIC_PAGES_FETCH_LIMIT,
  GEO_CHANGES_LIMIT,
  GEO_COMPETITOR_DETAIL_DAYS,
  GEO_COMPETITOR_SHARE_LIMIT,
  GEO_PROMPT_HISTORY_LIMIT,
  GEO_JOURNEY_DETAIL_LIMIT,
  GEO_MAX_COMPETITORS,
  GEO_MAX_ENGINES,
  GEO_MAX_LANGUAGES,
} from "../constants/geo";
import { GEO_MODEL_CATALOG_STATIC } from "../constants/geo-model-catalog";
import { GeoEntitlementService } from "../deps";
import type { DbTransaction } from "../types/db";
import type {
  AiTrafficResponse,
  GeoChangesResponse,
  GeoChangeScan,
  GeoCompetitor,
  GeoCompetitorDetailResponse,
  GeoCompetitorMerge,
  GeoCompetitorReconcileOutcome,
  GeoCompetitorSeed,
  GeoCompetitorShareResponse,
  GeoCompetitorsResponse,
  GeoCompetitorUpsertInput,
  GeoAutoPromptToggleResult,
  GeoInsertedPrompt,
  GeoJourneyDetailResponse,
  GeoLanguageShareResponse,
  GeoOverviewResponse,
  GeoPromptHistoryInput,
  GeoPromptHistoryResponse,
  GeoPromptInsert,
  GeoPromptRescanInput,
  GeoPromptResultsResponse,
  GeoPromptUpdateChanges,
  GeoScanStartInput,
  GeoScopeInput,
  GeoSettingsEngineAddInput,
  GeoSettingsLanguageAddInput,
  GeoSettingsResponse,
  GeoSettingsUpsertInput,
  GeoTimeseriesResponse,
  GeoTrackedPrompt,
  GeoTrackedPromptsResponse,
  GeoTrafficJourneysResponse,
  GeoTrafficLogResponse,
  GeoTrafficPagesResponse,
  GeoTrafficSource,
  GeoWindowInput,
} from "../types/geo";
import type {
  GeoCompetitorImportRow,
  GeoCompetitorsImportResult,
  GeoImportResult,
  GeoPromptImportRow,
} from "../types/geo-import";
import { toGeoTrafficTotals, toGeoVisitorType } from "../utils/ai-traffic";
import { geoAnswerSourcesFor } from "../utils/geo-answer-sources";
import {
  diffScanChecks,
  summarizeGeoChanges,
  toGeoScanCheckSnapshot,
} from "../utils/geo-changes";
import {
  normalizeConversionPaths,
  sumConversionVisits,
} from "../utils/geo-conversion-paths";
import { scopeGeoScanEngines } from "../utils/geo-engines";
import { trackedGeoLanguages } from "../utils/geo-language-rows";
import {
  geoDefaultEngines,
  getGeoModelCatalogEntry,
  isGeoEngineZdrCapable,
} from "../utils/geo-model-catalog";
import { normalizePromptTags } from "../utils/geo-prompt-tags";
import { groupGeoSparklinePoints } from "../utils/geo-sparkline";
import { competitorKey } from "./domain";
import { geoDb, geoQuery } from "./effect";
import {
  GeoCompetitorLimitError,
  GeoPromptDuplicateError,
  GeoPromptNotFoundError,
  GeoScanAlreadyRunningError,
  GeoScanEnginesEmptyError,
  GeoSettingsDisabledError,
  GeoSettingsMissingError,
  GeoSettingsTrackingError,
} from "./errors";
import { geoHiddenSourceParams } from "./hidden-sources";
import { lockGeoProject } from "./lock";
import {
  toGeoCompetitor,
  toGeoSettings,
  toGeoTrafficLogEntry,
  toTrackedPrompt,
} from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import {
  ensureGeoProject,
  geoCheckScope,
  geoScopeParams,
  requireGeoProject,
  resolveGeoScope,
} from "./projects";
import { promptKey } from "./prompt-key";
import { buildGeoPrompts, customPromptScanId } from "./prompts";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { nextGeoScanAt } from "./scan-schedule";
import { claimGeoScanRun } from "./scan-status";
import { geoTrafficWindowParams } from "./window";

function mergeLegacyCompetitors(
  competitors: GeoCompetitor[],
  legacyNames: readonly string[]
): GeoCompetitor[] {
  const seen = new Set(
    competitors.map((competitor) => competitorKey(competitor.name))
  );
  const merged = [...competitors];
  for (const name of legacyNames) {
    const key = competitorKey(name);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push({
      id: `legacy:${key}`,
      name,
      domain: null,
      synonyms: [],
      kind: "direct",
      color: null,
    });
  }
  return merged;
}

export const loadGeoSettings = Effect.fn("geo.settings")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  const row = scope.projectId
    ? yield* geoDb("settings lookup failed", () =>
        db.query.geoSettings.findFirst({
          where: eq(geoSettings.projectId, scope.projectId ?? ""),
        })
      )
    : null;

  const catalog = yield* loadGeoModelCatalog(scope.organizationId);
  const response: GeoSettingsResponse = {
    configured: isTinybirdConfigured(),
    settings: row ? toGeoSettings(row, catalog) : null,
  };
  return response;
});

const reconcileCompetitorsInTransaction = Effect.fn(
  "geo.competitorsReconcileTx"
)(function* (
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  merge: GeoCompetitorMerge,
  limit?: number
) {
  yield* lockGeoProject(tx, projectId);
  const [existing, settingsRow] = yield* Effect.all(
    [
      geoDb("competitors lookup failed", () =>
        tx.query.geoCompetitors.findMany({
          where: eq(geoCompetitors.projectId, projectId),
          orderBy: [asc(geoCompetitors.createdAt)],
        })
      ),
      geoDb("settings lookup failed", () =>
        tx.query.geoSettings.findFirst({
          columns: { competitors: true },
          where: eq(geoSettings.projectId, projectId),
        })
      ),
    ],
    { concurrency: "unbounded" }
  );
  const current = mergeLegacyCompetitors(
    existing.map(toGeoCompetitor),
    settingsRow?.competitors ?? []
  );
  const entries = merge(current);
  const existingByName = new Map(
    existing.map((row) => [competitorKey(row.name), row])
  );

  const resolved: Required<GeoCompetitorSeed>[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const name = entry.name.trim();
    const key = competitorKey(name);
    if (name.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const previous = existingByName.get(key);
    resolved.push({
      name,
      domain: entry.domain ?? previous?.domain ?? null,
      synonyms: entry.synonyms ?? previous?.synonyms ?? [],
      kind: entry.kind ?? previous?.kind ?? "direct",
      color: entry.color ?? previous?.color ?? null,
    });
  }

  if (limit !== undefined && resolved.length > limit) {
    const overLimit: GeoCompetitorReconcileOutcome = { status: "limit" };
    return overLimit;
  }

  const staleIds = existing.flatMap((row) =>
    seen.has(competitorKey(row.name)) ? [] : [row.id]
  );
  if (staleIds.length > 0) {
    yield* geoDb("competitors delete failed", () =>
      tx
        .delete(geoCompetitors)
        .where(
          and(
            eq(geoCompetitors.projectId, projectId),
            inArray(geoCompetitors.id, staleIds)
          )
        )
    );
  }

  if (resolved.length > 0) {
    yield* geoDb("competitors upsert failed", () =>
      tx
        .insert(geoCompetitors)
        .values(
          resolved.map((entry) => ({
            id: crypto.randomUUID(),
            organizationId,
            projectId,
            name: entry.name,
            domain: entry.domain,
            synonyms: entry.synonyms,
            kind: entry.kind,
            color: entry.color,
          }))
        )
        .onConflictDoUpdate({
          target: [geoCompetitors.projectId, geoCompetitors.name],
          set: {
            domain: sql`excluded.domain`,
            synonyms: sql`excluded.synonyms`,
            kind: sql`excluded.kind`,
            color: sql`excluded.color`,
          },
        })
    );
  }

  yield* geoDb("settings update failed", () =>
    tx
      .update(geoSettings)
      .set({ competitors: resolved.map((entry) => entry.name) })
      .where(eq(geoSettings.projectId, projectId))
  );

  const rows = yield* geoDb("competitors lookup failed", () =>
    tx.query.geoCompetitors.findMany({
      where: eq(geoCompetitors.projectId, projectId),
      orderBy: [asc(geoCompetitors.createdAt)],
    })
  );
  const outcome: GeoCompetitorReconcileOutcome = {
    status: "ok",
    competitors: rows.map(toGeoCompetitor),
  };
  return outcome;
});

export const reconcileGeoCompetitors = Effect.fn("geo.competitorsReconcile")(
  function* (input: GeoScopeInput, merge: GeoCompetitorMerge, limit?: number) {
    const scope = yield* requireGeoProject(input);
    const outcome = yield* geoDb("competitors sync failed", () =>
      db.transaction((tx) =>
        Effect.runPromise(
          reconcileCompetitorsInTransaction(
            tx,
            scope.organizationId,
            scope.projectId,
            merge,
            limit
          )
        )
      )
    );

    if (outcome.status === "limit") {
      return yield* Effect.fail(
        new GeoCompetitorLimitError({ limit: limit ?? GEO_MAX_COMPETITORS })
      );
    }
    return outcome.competitors;
  }
);

const loadCompetitorsByProject = Effect.fn("geo.competitorsByProject")(
  function* (projectId: string) {
    const [rows, settingsRow] = yield* Effect.all(
      [
        geoDb("competitors lookup failed", () =>
          db.query.geoCompetitors.findMany({
            where: eq(geoCompetitors.projectId, projectId),
            orderBy: [asc(geoCompetitors.createdAt)],
          })
        ),
        geoDb("settings lookup failed", () =>
          db.query.geoSettings.findFirst({
            columns: { competitors: true },
            where: eq(geoSettings.projectId, projectId),
          })
        ),
      ],
      { concurrency: "unbounded" }
    );

    return mergeLegacyCompetitors(
      rows.map(toGeoCompetitor),
      settingsRow?.competitors ?? []
    );
  }
);

export const loadGeoCompetitors = Effect.fn("geo.competitors")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  if (!scope.projectId) {
    const emptyResponse: GeoCompetitorsResponse = { competitors: [] };
    return emptyResponse;
  }

  const response: GeoCompetitorsResponse = {
    competitors: yield* loadCompetitorsByProject(scope.projectId),
  };
  return response;
});

export const upsertGeoCompetitor = Effect.fn("geo.competitorUpsert")(function* (
  scopeInput: GeoScopeInput,
  input: GeoCompetitorUpsertInput
) {
  const key = competitorKey(input.previousName ?? input.name);
  const competitors = yield* reconcileGeoCompetitors(scopeInput, (current) => {
    const entries: GeoCompetitorSeed[] = current.map((competitor) =>
      competitorKey(competitor.name) === key
        ? {
            name: input.name.trim(),
            domain: input.domain,
            synonyms: input.synonyms ?? competitor.synonyms,
            kind: input.kind ?? competitor.kind,
            color: input.color ?? competitor.color,
          }
        : competitor
    );

    if (
      !entries.some(
        (entry) => competitorKey(entry.name) === competitorKey(input.name)
      )
    ) {
      entries.push({
        name: input.name.trim(),
        domain: input.domain,
        synonyms: input.synonyms ?? [],
        kind: input.kind ?? "direct",
        color: input.color ?? null,
      });
    }
    return entries;
  });
  const response: GeoCompetitorsResponse = { competitors };
  return response;
});

export const deleteGeoCompetitor = Effect.fn("geo.competitorDelete")(function* (
  scopeInput: GeoScopeInput,
  name: string
) {
  const key = competitorKey(name);
  const competitors = yield* reconcileGeoCompetitors(scopeInput, (current) =>
    current.filter((competitor) => competitorKey(competitor.name) !== key)
  );
  const response: GeoCompetitorsResponse = { competitors };
  return response;
});

export const importGeoCompetitors = Effect.fn("geo.competitorsImport")(
  function* (
    scopeInput: GeoScopeInput,
    rows: readonly GeoCompetitorImportRow[]
  ) {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const competitors = yield* reconcileGeoCompetitors(
      scopeInput,
      (current) => {
        imported = 0;
        updated = 0;
        skipped = 0;
        const entries: Required<GeoCompetitorSeed>[] = current.map(
          (competitor) => ({
            name: competitor.name,
            domain: competitor.domain,
            synonyms: competitor.synonyms,
            kind: competitor.kind,
            color: competitor.color,
          })
        );
        const indexByKey = new Map(
          entries.map((entry, index) => [competitorKey(entry.name), index])
        );
        const seen = new Set<string>();

        for (const row of rows) {
          const name = row.name.trim();
          const key = competitorKey(name);
          if (seen.has(key)) {
            skipped += 1;
            continue;
          }
          seen.add(key);
          const index = indexByKey.get(key);
          const previous = index === undefined ? undefined : entries[index];
          if (index === undefined || !previous) {
            entries.push({
              name,
              domain: row.domain ?? null,
              synonyms: row.synonyms ?? [],
              kind: row.kind ?? "direct",
              color: null,
            });
            indexByKey.set(key, entries.length - 1);
            imported += 1;
            continue;
          }
          entries[index] = {
            name: previous.name,
            domain: row.domain ?? previous.domain,
            synonyms: row.synonyms ?? previous.synonyms,
            kind: row.kind ?? previous.kind,
            color: previous.color,
          };
          updated += 1;
        }
        return entries;
      },
      GEO_MAX_COMPETITORS
    );

    const result: GeoCompetitorsImportResult = {
      imported,
      updated,
      skipped,
      competitors,
    };
    return result;
  }
);

export const addGeoTrackedEngine = Effect.fn("geo.settingsEngineAdd")(
  function* (input: GeoSettingsEngineAddInput) {
    const { projectId } = yield* requireGeoProject(input);
    const catalog = yield* loadGeoModelCatalog(input.organizationId);
    if (!getGeoModelCatalogEntry(catalog, input.engine)) {
      return yield* Effect.fail(
        new GeoSettingsTrackingError({
          message: "This model is no longer available for tracking",
        })
      );
    }

    const initialEngines = [
      ...new Set([...geoDefaultEngines(catalog), input.engine]),
    ];
    const updated = yield* geoDb("tracked engine update failed", () =>
      db
        .update(geoSettings)
        .set({
          engines: sql<string[]>`
            CASE
              WHEN ${geoSettings.engines} IS NULL OR cardinality(${geoSettings.engines}) = 0
                THEN ${sql.param(initialEngines)}::text[]
              WHEN ${input.engine} = ANY(${geoSettings.engines})
                THEN ${geoSettings.engines}
              WHEN (
                SELECT count(DISTINCT engine)
                FROM unnest(${geoSettings.engines}) AS tracked_engines(engine)
              ) < ${GEO_MAX_ENGINES}
                THEN array_append(${geoSettings.engines}, ${input.engine})
              ELSE ${geoSettings.engines}
            END
          `,
        })
        .where(
          and(
            eq(geoSettings.organizationId, input.organizationId),
            eq(geoSettings.projectId, projectId),
            sql`(
              NOT ${geoSettings.enforceZdr}
              OR ${isGeoEngineZdrCapable(catalog, input.engine)}
              OR ${input.engine} = ANY(${geoSettings.nonZdrApprovedEngines})
            )`
          )
        )
        .returning({ engines: geoSettings.engines })
    );

    if (!updated.at(0)?.engines?.includes(input.engine)) {
      return yield* Effect.fail(
        new GeoSettingsTrackingError({
          message:
            "This model cannot be added under the current tracking settings",
        })
      );
    }
  }
);

export const addGeoTrackedLanguage = Effect.fn("geo.settingsLanguageAdd")(
  function* (input: GeoSettingsLanguageAddInput) {
    const { projectId } = yield* requireGeoProject(input);
    const initialLanguages = [
      ...new Set([...trackedGeoLanguages([]), input.language]),
    ];
    const updated = yield* geoDb("tracked language update failed", () =>
      db
        .update(geoSettings)
        .set({
          languages: sql<string[]>`
            CASE
              WHEN ${geoSettings.languages} IS NULL OR cardinality(${geoSettings.languages}) = 0
                THEN ${sql.param(initialLanguages)}::text[]
              WHEN ${input.language} = ANY(${geoSettings.languages})
                THEN ${geoSettings.languages}
              WHEN (
                SELECT count(DISTINCT language)
                FROM unnest(${geoSettings.languages}) AS tracked_languages(language)
              ) < ${GEO_MAX_LANGUAGES}
                THEN array_append(${geoSettings.languages}, ${input.language})
              ELSE ${geoSettings.languages}
            END
          `,
        })
        .where(
          and(
            eq(geoSettings.organizationId, input.organizationId),
            eq(geoSettings.projectId, projectId)
          )
        )
        .returning({ languages: geoSettings.languages })
    );

    if (!updated.at(0)?.languages?.includes(input.language)) {
      return yield* Effect.fail(
        new GeoSettingsTrackingError({
          message: "This language cannot be added to tracking",
        })
      );
    }
  }
);

export const upsertGeoSettings = Effect.fn("geo.settingsUpsert")(function* (
  input: GeoSettingsUpsertInput
) {
  const entitlements = yield* GeoEntitlementService;
  const projectId = yield* ensureGeoProject(
    { organizationId: input.organizationId, projectId: input.projectId },
    input.companyName
  );

  // Zero data retention needs the ZDR add-on: without the entitlement the
  // flag is forced off regardless of what the client sent.
  // resolveZdrEntitlement never throws; a billing outage answers "unknown",
  // which counts as not entitled here so the toggle fails closed.
  const entitlement = yield* entitlements.resolveZdrEntitlement(
    input.organizationId
  );
  const enforceZdr = entitlement === "entitled" && input.enforceZdr;
  const catalog = yield* loadGeoModelCatalog(input.organizationId);
  // Static engines hidden from this organization (missing credential or flag
  // off) keep their stored selection so a re-save doesn't silently drop them.
  const unavailableStaticEngines = new Set<string>();
  for (const entry of GEO_MODEL_CATALOG_STATIC) {
    if (!getGeoModelCatalogEntry(catalog, entry.id)) {
      unavailableStaticEngines.add(entry.id);
    }
  }
  const existingSettings = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      columns: {
        engines: true,
        nonZdrApprovedEngines: true,
        conversionPaths: true,
        pausedAutoPromptIds: true,
        enabled: true,
        nextScanAt: true,
        scanIntervalHours: true,
      },
      where: eq(geoSettings.projectId, projectId),
    })
  );
  const pausedAutoPromptIds =
    input.pausedAutoPromptIds ?? existingSettings?.pausedAutoPromptIds ?? [];
  const conversionPaths = normalizeConversionPaths(
    input.conversionPaths ?? existingSettings?.conversionPaths ?? []
  );
  const preservedEngines = (existingSettings?.engines ?? []).filter(
    (engine) =>
      unavailableStaticEngines.size > 0 && unavailableStaticEngines.has(engine)
  );
  const preservedEngineSet = new Set(preservedEngines);
  const engines = [...new Set([...input.engines, ...preservedEngines])];
  const engineSet = new Set(engines);
  const nonZdrApprovedEngines = [
    ...new Set([
      ...input.nonZdrApprovedEngines,
      ...(existingSettings?.nonZdrApprovedEngines ?? []).filter((engine) =>
        preservedEngineSet.has(engine)
      ),
    ]),
  ].filter((engine) => engineSet.has(engine));

  // The schedule is a plain due stamp the cron sweep polls. A fresh enable or
  // an interval change re-arms it a full interval out (matching the old
  // delayed-message behaviour); an unchanged enabled row keeps its pending
  // due time, and disabling clears it.
  const keepNextScanAt =
    input.enabled &&
    existingSettings?.enabled === true &&
    existingSettings.scanIntervalHours === input.scanIntervalHours;
  let nextScanAt: Date | null = null;
  if (input.enabled) {
    nextScanAt = keepNextScanAt
      ? (existingSettings?.nextScanAt ?? nextGeoScanAt(input.scanIntervalHours))
      : nextGeoScanAt(input.scanIntervalHours);
  }

  yield* geoDb("settings upsert failed", () =>
    db
      .insert(geoSettings)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        projectId,
        companyName: input.companyName,
        aliases: input.aliases,
        competitors: [],
        conversionPaths,
        languages: input.languages,
        engines,
        enforceZdr,
        nonZdrApprovedEngines,
        pausedAutoPromptIds,
        enabled: input.enabled,
        scanIntervalHours: input.scanIntervalHours,
        nextScanAt,
      })
      .onConflictDoUpdate({
        target: geoSettings.projectId,
        set: {
          companyName: input.companyName,
          aliases: input.aliases,
          conversionPaths,
          languages: input.languages,
          engines,
          enforceZdr,
          nonZdrApprovedEngines,
          pausedAutoPromptIds,
          enabled: input.enabled,
          scanIntervalHours: input.scanIntervalHours,
          nextScanAt,
        },
      })
  );

  yield* reconcileGeoCompetitors(
    { organizationId: input.organizationId, projectId },
    (current) => current
  );

  const rows = yield* geoDb("settings lookup failed", () =>
    db.select().from(geoSettings).where(eq(geoSettings.projectId, projectId))
  );

  const row = rows.at(0);
  const response: GeoSettingsResponse = {
    configured: isTinybirdConfigured(),
    settings: row ? toGeoSettings(row, catalog) : null,
  };
  return response;
});

export const loadGeoLanguageShare = Effect.fn("geo.languageShare")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const checkScope = geoCheckScope(scope);
  const checkWindow = toGeoCheckWindow(window);
  const [rows, trendRows] = yield* Effect.all(
    [
      geoDb("language share query failed", () =>
        queryGeoCheckLanguageShare(checkScope, checkWindow)
      ),
      geoDb("language share trends query failed", () =>
        queryGeoCheckLanguageShareTrends(checkScope, checkWindow)
      ),
    ],
    { concurrency: "unbounded" }
  );
  const trendsByLanguage = groupGeoSparklinePoints(
    trendRows,
    (point) => point.language,
    (point) => ({ day: point.day, value: point.mentionRate })
  );

  const response: GeoLanguageShareResponse = {
    configured: true,
    points: rows.map((row) => ({
      language: row.language,
      checks: row.checks,
      mentions: row.mentions,
      mentionRate: row.mentionRate,
      avgPosition: row.avgPosition,
      trend: trendsByLanguage.get(row.language) ?? [],
    })),
  };
  return response;
});

export const loadGeoOverview = Effect.fn("geo.overview")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("overview query failed", () =>
    queryGeoCheckOverview(geoCheckScope(scope), toGeoCheckWindow(window))
  );

  const engines: GeoOverviewResponse["engines"] = rows.map((row) => ({
    engine: row.engine,
    checks: row.checks,
    mentions: row.mentions,
    mentionRate: row.mentionRate,
    avgPosition: row.avgPosition,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
  }));

  const response: GeoOverviewResponse = {
    configured: true,
    engines,
  };
  return response;
});

export const loadGeoTimeseries = Effect.fn("geo.timeseries")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("timeseries query failed", () =>
    queryGeoCheckTimeseries(geoCheckScope(scope), toGeoCheckWindow(window))
  );

  const response: GeoTimeseriesResponse = {
    configured: true,
    points: rows.map((row) => ({
      day: row.day,
      engine: row.engine,
      checks: row.checks,
      mentions: row.mentions,
      avgPosition: row.avgPosition,
    })),
  };
  return response;
});

export const loadGeoPromptResults = Effect.fn("geo.promptResults")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("prompt results query failed", () =>
    queryGeoCheckPromptResults(geoCheckScope(scope), toGeoCheckWindow(window))
  );

  const response: GeoPromptResultsResponse = {
    configured: true,
    results: rows.map((row) => ({
      promptId: row.promptId,
      engine: row.engine,
      prompt: row.prompt,
      answer: row.answer,
      mentioned: row.mentioned,
      position: row.position,
      sentiment: row.sentiment,
      competitors: row.competitors,
      excerpt: row.excerpt,
      searchQueries: row.grounding.queries,
      sources: geoAnswerSourcesFor(row.grounding, row.sources),
      finishReason: row.finishReason,
      promptTokens: row.promptTokens,
      outputTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
      truncated: row.truncated,
      lastCheckedAt: row.lastCheckedAt.toISOString(),
    })),
  };
  return response;
});

function promptHistoryScanIds(promptId: string): string[] {
  return [...new Set([promptId, customPromptScanId(promptId)])];
}

export const loadGeoPromptHistory = Effect.fn("geo.promptHistory")(function* (
  input: GeoPromptHistoryInput
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("prompt history query failed", () =>
    queryGeoCheckPromptHistory(geoCheckScope(scope), {
      promptIds: promptHistoryScanIds(input.promptId),
      limit: GEO_PROMPT_HISTORY_LIMIT,
    })
  );

  const response: GeoPromptHistoryResponse = {
    configured: true,
    promptId: input.promptId,
    checks: rows.map((row) => ({
      id: row.id,
      scanId: row.scanId,
      engine: row.engine,
      mentioned: row.mentioned,
      position: row.position,
      sentiment: row.sentiment,
      competitors: row.competitors,
      answer: row.answer,
      excerpt: row.excerpt,
      searchQueries: row.grounding.queries,
      sources: geoAnswerSourcesFor(row.grounding, row.sources),
      language: row.language,
      capturedAt: row.capturedAt.toISOString(),
    })),
  };
  return response;
});

function toGeoChangeScan(
  scan: { id: string; finishedAt: Date | null } | null
): GeoChangeScan | null {
  if (!scan) {
    return null;
  }
  return { id: scan.id, finishedAt: scan.finishedAt?.toISOString() ?? null };
}

export const loadGeoChanges = Effect.fn("geo.changes")(function* (
  input: GeoScopeInput
) {
  const scope = yield* requireGeoProject(input);
  const comparison = yield* geoDb("scan comparison query failed", () =>
    queryGeoScanComparison({ projectId: scope.projectId })
  );
  const events = diffScanChecks(
    comparison.previous.map(toGeoScanCheckSnapshot),
    comparison.current.map(toGeoScanCheckSnapshot)
  );

  const response: GeoChangesResponse = {
    previousScan: toGeoChangeScan(comparison.previousScan),
    currentScan: toGeoChangeScan(comparison.currentScan),
    summary: summarizeGeoChanges(events),
    events: events.slice(0, GEO_CHANGES_LIMIT),
  };
  return response;
});

export const loadGeoCompetitorShare = Effect.fn("geo.competitorShare")(
  function* (
    input: GeoScopeInput,
    window: GeoWindowInput,
    summaryOnly = false
  ) {
    const scope = yield* resolveGeoScope(input);
    const checkScope = geoCheckScope(scope);
    const checkWindow = toGeoCheckWindow(window);

    if (summaryOnly) {
      // The competitors page only renders aggregate shares. Avoid the two
      // additional full-range scans used for overview sparklines and charts.
      const rows = yield* geoDb("competitor share query failed", () =>
        queryGeoCheckCompetitorShare(
          checkScope,
          checkWindow,
          GEO_COMPETITOR_SHARE_LIMIT
        )
      );
      const response: GeoCompetitorShareResponse = {
        configured: true,
        points: rows.map((row) => ({
          brand: row.brand,
          mentions: row.mentions,
        })),
        timeseries: [],
      };
      return response;
    }

    const [rows, timeseries, trendRows] = yield* Effect.all(
      [
        geoDb("competitor share query failed", () =>
          queryGeoCheckCompetitorShare(
            checkScope,
            checkWindow,
            GEO_COMPETITOR_SHARE_LIMIT
          )
        ),
        geoDb("competitor share timeseries query failed", () =>
          queryGeoCheckCompetitorShareTimeseries(checkScope, checkWindow)
        ),
        geoDb("competitor share trends query failed", () =>
          queryGeoCheckCompetitorShareTrends(
            checkScope,
            checkWindow,
            GEO_COMPETITOR_SHARE_LIMIT
          )
        ),
      ],
      { concurrency: "unbounded" }
    );
    const trendsByBrand = groupGeoSparklinePoints(
      trendRows,
      (point) => point.brand,
      (point) => ({ day: point.day, value: point.share })
    );

    const response: GeoCompetitorShareResponse = {
      configured: true,
      points: rows.map((row) => ({
        brand: row.brand,
        mentions: row.mentions,
        trend: trendsByBrand.get(row.brand) ?? [],
      })),
      timeseries: timeseries.map((row) => ({
        brand: row.brand,
        day: row.day,
        mentions: row.mentions,
      })),
    };
    return response;
  }
);

export const loadGeoCompetitorDetail = Effect.fn("geo.competitorDetail")(
  function* (input: GeoScopeInput, brand: string, window: GeoWindowInput) {
    const scope = yield* resolveGeoScope(input);
    const resolvedWindow =
      toGeoCheckWindow(window) ??
      toGeoCheckWindow({ days: GEO_COMPETITOR_DETAIL_DAYS });

    const checkScope = geoCheckScope(scope);
    const [timeseries, prompts] = yield* Effect.all(
      [
        geoDb("competitor timeseries query failed", () =>
          queryGeoCheckCompetitorTimeseries(checkScope, brand, resolvedWindow)
        ),
        geoDb("competitor prompts query failed", () =>
          queryGeoCheckCompetitorPrompts(checkScope, brand, resolvedWindow)
        ),
      ],
      { concurrency: "unbounded" }
    );

    const response: GeoCompetitorDetailResponse = {
      configured: true,
      points: timeseries.map((row) => ({
        day: row.day,
        mentions: row.mentions,
        checks: row.checks,
      })),
      prompts: prompts.map((row) => ({
        promptId: row.promptId,
        prompt: row.prompt,
        engine: row.engine,
        capturedAt: row.capturedAt.toISOString(),
        mentioned: row.mentioned,
        position: row.position,
      })),
    };
    return response;
  }
);

export const loadAiTraffic = Effect.fn("geo.aiTraffic")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const windowParams = geoTrafficWindowParams(window, AI_TRAFFIC_DEFAULT_DAYS);
  const settingsRow = scope.projectId
    ? yield* geoDb("settings lookup failed", () =>
        db.query.geoSettings.findFirst({
          columns: { conversionPaths: true },
          where: eq(geoSettings.projectId, scope.projectId ?? ""),
        })
      )
    : null;
  const conversionPaths = settingsRow?.conversionPaths ?? [];

  const [overview, timeseries, conversionPages] = yield* Effect.all(
    [
      geoQuery("traffic overview query failed", () =>
        queryGeoTrafficOverview({
          ...geoScopeParams(scope),
          ...geoHiddenSourceParams(),
          ...windowParams,
        })
      ),
      geoQuery("traffic timeseries query failed", () =>
        queryGeoTrafficTimeseries({
          ...geoScopeParams(scope),
          ...geoHiddenSourceParams(),
          ...windowParams,
        })
      ),
      conversionPaths.length === 0
        ? Effect.succeed(null)
        : geoQuery("traffic conversion pages query failed", () =>
            queryGeoTrafficPages({
              ...geoScopeParams(scope),
              ...geoHiddenSourceParams(),
              ...windowParams,
              limit: AI_TRAFFIC_PAGES_FETCH_LIMIT,
              visitor: "ai_referral",
            })
          ),
    ],
    { concurrency: "unbounded" }
  );
  const conversionTotals =
    conversionPaths.length === 0
      ? null
      : sumConversionVisits(
          (conversionPages?.data ?? []).map((row) => ({
            path: row.path,
            visits: Number(row.visits),
            ...(row.previous_visits == null
              ? {}
              : { previousVisits: Number(row.previous_visits) }),
          })),
          conversionPaths
        );

  const sources: GeoTrafficSource[] = (overview?.data ?? []).map((row) => ({
    source: row.source,
    visitorType: toGeoVisitorType(row.visitor_type),
    agent: row.agent,
    category: row.category,
    confidence: row.confidence,
    visits: Number(row.visits),
    ...(row.previous_visits == null
      ? {}
      : { previousVisits: Number(row.previous_visits) }),
    markdownVisits: Number(row.markdown_visits),
    paths: Number(row.paths),
    lastSeenAt: row.last_seen_at,
  }));

  const response: AiTrafficResponse = {
    configured: isTinybirdConfigured(),
    totals: toGeoTrafficTotals(sources, conversionTotals?.conversions ?? null),
    previousConversions: conversionTotals?.previousConversions ?? null,
    sources: sources.filter(
      (row) =>
        row.visitorType === "crawler" || row.visitorType === "ai_referral"
    ),
    points: (timeseries?.data ?? []).map((row) => ({
      day: row.day,
      visitorType: toGeoVisitorType(row.visitor_type),
      source: row.source ?? "",
      visits: Number(row.visits),
    })),
  };
  return response;
});

export const loadGeoTrafficLog = Effect.fn("geo.trafficLog")(function* (
  input: GeoScopeInput,
  limit: number | undefined,
  visitorTypes: readonly string[] | undefined,
  categories: readonly string[] | undefined
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoQuery("traffic log query failed", () =>
    queryGeoTrafficLog({
      ...geoScopeParams(scope),
      ...geoHiddenSourceParams(),
      limit: limit ?? AI_TRAFFIC_DEFAULT_LOG_LIMIT,
      visitor_type: visitorTypes?.join(",") ?? "",
      category: categories?.join(",") ?? "",
    })
  );
  const data = rows?.data ?? [];
  const log = data.map(toGeoTrafficLogEntry);

  const response: GeoTrafficLogResponse = {
    configured: isTinybirdConfigured(),
    log,
    total: log.length,
  };
  return response;
});

export const loadGeoTrafficJourneys = Effect.fn("geo.trafficJourneys")(
  function* (
    input: GeoScopeInput,
    window: GeoWindowInput,
    limit: number | undefined
  ) {
    const scope = yield* resolveGeoScope(input);
    const journeys = yield* geoQuery("traffic journeys query failed", () =>
      queryGeoTrafficJourneys({
        ...geoScopeParams(scope),
        ...geoHiddenSourceParams(),
        ...geoTrafficWindowParams(window, AI_TRAFFIC_DEFAULT_DAYS),
        limit: limit ?? AI_TRAFFIC_DEFAULT_JOURNEYS_LIMIT,
      })
    );

    const response: GeoTrafficJourneysResponse = {
      configured: isTinybirdConfigured(),
      journeys: (journeys?.data ?? []).map((row) => ({
        journeyId: row.journey_id,
        source: row.source,
        visitorType: toGeoVisitorType(row.visitor_type),
        pages: Number(row.pages),
        distinctPaths: Number(row.distinct_paths),
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        samplePaths: row.sample_paths,
      })),
    };
    return response;
  }
);

export const loadGeoJourneyDetail = Effect.fn("geo.journeyDetail")(function* (
  input: GeoScopeInput,
  journeyId: string,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const detail = yield* geoQuery("journey detail query failed", () =>
    queryGeoJourneyDetail({
      ...geoScopeParams(scope),
      ...geoHiddenSourceParams(),
      journey_id: journeyId,
      ...geoTrafficWindowParams(window, AI_TRAFFIC_DEFAULT_DAYS),
      limit: GEO_JOURNEY_DETAIL_LIMIT,
    })
  );

  const response: GeoJourneyDetailResponse = {
    configured: isTinybirdConfigured(),
    events: (detail?.data ?? []).map((row) => ({
      capturedAt: row.captured_at,
      path: row.path,
      host: row.host,
      method: row.method,
      referer: row.referer,
      country: row.country,
      agent: row.agent,
      category: row.category,
    })),
  };
  return response;
});

export const loadGeoTrafficPages = Effect.fn("geo.trafficPages")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput,
  limit: number | undefined,
  visitorType: string | undefined
) {
  const scope = yield* resolveGeoScope(input);
  const pages = yield* geoQuery("traffic pages query failed", () =>
    queryGeoTrafficPages({
      ...geoScopeParams(scope),
      ...geoHiddenSourceParams(),
      ...geoTrafficWindowParams(window, AI_TRAFFIC_DEFAULT_DAYS),
      limit: limit ?? AI_TRAFFIC_DEFAULT_PAGES_LIMIT,
      visitor: visitorType ?? "",
    })
  );

  const response: GeoTrafficPagesResponse = {
    configured: isTinybirdConfigured(),
    pages: (pages?.data ?? []).map((row) => ({
      path: row.path,
      source: row.source,
      visitorType: toGeoVisitorType(row.visitor_type),
      visits: Number(row.visits),
      ...(row.previous_visits != null
        ? { previousVisits: Number(row.previous_visits) }
        : {}),
      lastSeenAt: row.last_seen_at,
    })),
  };
  return response;
});

export const listGeoPrompts = Effect.fn("geo.promptsList")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  if (!scope.projectId) {
    const emptyResponse: GeoTrackedPromptsResponse = {
      configured: isTinybirdConfigured(),
      prompts: [],
    };
    return emptyResponse;
  }

  const projectId = scope.projectId;
  const [customRows, settingsRow, brand] = yield* Effect.all(
    [
      geoDb("prompts lookup failed", () =>
        db.query.geoPrompts.findMany({
          where: eq(geoPrompts.projectId, projectId),
          orderBy: [desc(geoPrompts.createdAt)],
        })
      ),
      geoDb("settings lookup failed", () =>
        db.query.geoSettings.findFirst({
          where: eq(geoSettings.projectId, projectId),
        })
      ),
      geoDb("brand lookup failed", () =>
        db.query.brandSettings.findFirst({
          columns: { companyDescription: true, audience: true },
          where: and(
            eq(brandSettings.organizationId, scope.organizationId),
            eq(brandSettings.id, scope.brandSettingsId ?? "")
          ),
        })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const prompts: GeoTrackedPrompt[] = customRows.map(toTrackedPrompt);

  if (!settingsRow) {
    const emptyResponse: GeoTrackedPromptsResponse = {
      configured: isTinybirdConfigured(),
      prompts,
    };
    return emptyResponse;
  }

  const catalog = yield* loadGeoModelCatalog(scope.organizationId);
  const autoPrompts = buildGeoPrompts(
    toGeoSettings(settingsRow, catalog),
    brand
      ? {
          companyDescription: brand.companyDescription,
          audience: brand.audience,
        }
      : null
  );

  const pausedAutoPromptIds = new Set(settingsRow.pausedAutoPromptIds);
  for (const autoPrompt of autoPrompts) {
    prompts.push({
      id: autoPrompt.id,
      prompt: autoPrompt.text,
      enabled: !pausedAutoPromptIds.has(autoPrompt.id),
      source: "auto",
      tags: [],
      createdAt: null,
    });
  }

  const response: GeoTrackedPromptsResponse = {
    configured: isTinybirdConfigured(),
    prompts,
  };
  return response;
});

const createPromptInTransaction = Effect.fn("geo.promptsCreateTx")(function* (
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  prompt: string,
  id?: string,
  tags: readonly string[] = []
) {
  yield* lockGeoProject(tx, projectId);
  const duplicate = yield* geoDb("prompt lookup failed", () =>
    tx.query.geoPrompts.findFirst({
      columns: { id: true },
      where: and(
        eq(geoPrompts.projectId, projectId),
        sql`lower(trim(${geoPrompts.prompt})) = ${promptKey(prompt)}`
      ),
    })
  );
  if (duplicate) {
    return null;
  }
  const rows = yield* geoDb("prompt create failed", () =>
    tx
      .insert(geoPrompts)
      .values({
        id: id ?? crypto.randomUUID(),
        organizationId,
        projectId,
        prompt,
        tags: normalizePromptTags(tags),
      })
      .returning()
  );
  return rows.at(0) ?? null;
});

export const createGeoPrompt = Effect.fn("geo.promptsCreate")(function* (
  input: GeoScopeInput,
  prompt: string,
  id?: string,
  tags: readonly string[] = []
) {
  const scope = yield* requireGeoProject(input);
  const row = yield* geoDb("prompt create failed", () =>
    db.transaction((tx) =>
      Effect.runPromise(
        createPromptInTransaction(
          tx,
          scope.organizationId,
          scope.projectId,
          prompt,
          id,
          tags
        )
      )
    )
  );

  if (!row) {
    return yield* Effect.fail(new GeoPromptDuplicateError({ prompt }));
  }

  return toTrackedPrompt(row);
});

const insertPromptsInTransaction = Effect.fn("geo.promptsInsertTx")(function* (
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  entries: readonly GeoPromptInsert[]
) {
  yield* lockGeoProject(tx, projectId);
  const existing = yield* geoDb("prompts lookup failed", () =>
    tx.query.geoPrompts.findMany({
      columns: { prompt: true },
      where: eq(geoPrompts.projectId, projectId),
    })
  );
  const seen = new Set(existing.map((row) => promptKey(row.prompt)));
  const values = entries.flatMap((entry) => {
    const prompt = entry.prompt.trim();
    const key = promptKey(prompt);
    if (prompt.length === 0 || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [
      {
        id: crypto.randomUUID(),
        organizationId,
        projectId,
        prompt,
        title: entry.title ?? null,
        enabled: entry.enabled ?? true,
      },
    ];
  });

  if (values.length === 0) {
    const none: GeoInsertedPrompt[] = [];
    return none;
  }
  const rows = yield* geoDb("prompts insert failed", () =>
    tx
      .insert(geoPrompts)
      .values(values)
      .returning({ id: geoPrompts.id, prompt: geoPrompts.prompt })
  );
  const inserted: GeoInsertedPrompt[] = rows;
  return inserted;
});

export { insertPromptsInTransaction, reconcileCompetitorsInTransaction };

export const insertGeoPrompts = Effect.fn("geo.promptsInsert")(function* (
  input: GeoScopeInput,
  entries: readonly GeoPromptInsert[]
) {
  const scope = yield* requireGeoProject(input);
  return yield* geoDb("prompts insert failed", () =>
    db.transaction((tx) =>
      Effect.runPromise(
        insertPromptsInTransaction(
          tx,
          scope.organizationId,
          scope.projectId,
          entries
        )
      )
    )
  );
});

export const importGeoPrompts = Effect.fn("geo.promptsImport")(function* (
  input: GeoScopeInput,
  rows: readonly GeoPromptImportRow[]
) {
  const inserted = yield* insertGeoPrompts(input, rows);

  const result: GeoImportResult = {
    imported: inserted.length,
    updated: 0,
    skipped: rows.length - inserted.length,
  };
  return result;
});

export const deleteGeoPrompt = Effect.fn("geo.promptsDelete")(function* (
  input: GeoScopeInput,
  promptId: string
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("prompt delete failed", () =>
    db
      .delete(geoPrompts)
      .where(
        and(
          eq(geoPrompts.id, promptId),
          eq(geoPrompts.organizationId, scope.organizationId),
          eq(geoPrompts.projectId, scope.projectId)
        )
      )
      .returning()
  );

  if (!rows.at(0)) {
    return yield* Effect.fail(new GeoPromptNotFoundError({ promptId }));
  }

  return { success: true };
});

export const updateGeoPrompt = Effect.fn("geo.promptsUpdate")(function* (
  input: GeoScopeInput,
  promptId: string,
  changes: GeoPromptUpdateChanges
) {
  const scope = yield* requireGeoProject(input);
  const set: { enabled?: boolean; tags?: string[] } = {};
  if (changes.enabled !== undefined) {
    set.enabled = changes.enabled;
  }
  if (changes.tags !== undefined) {
    set.tags = normalizePromptTags(changes.tags);
  }
  const rows = yield* geoDb("prompt update failed", () =>
    db
      .update(geoPrompts)
      .set(set)
      .where(
        and(
          eq(geoPrompts.id, promptId),
          eq(geoPrompts.organizationId, scope.organizationId),
          eq(geoPrompts.projectId, scope.projectId)
        )
      )
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(new GeoPromptNotFoundError({ promptId }));
  }

  return toTrackedPrompt(row);
});

export const toggleGeoAutoPrompt = Effect.fn("geo.promptsToggleAuto")(
  function* (input: GeoScopeInput, promptId: string, enabled: boolean) {
    const scope = yield* requireGeoProject(input);
    const settingsRow = yield* geoDb("settings lookup failed", () =>
      db.query.geoSettings.findFirst({
        columns: { pausedAutoPromptIds: true },
        where: eq(geoSettings.projectId, scope.projectId),
      })
    );
    if (!settingsRow) {
      return yield* Effect.fail(
        new GeoSettingsMissingError({ organizationId: scope.organizationId })
      );
    }
    const paused = new Set(settingsRow.pausedAutoPromptIds);
    if (enabled) {
      paused.delete(promptId);
    } else {
      paused.add(promptId);
    }
    const pausedAutoPromptIds = [...paused];
    yield* geoDb("auto prompt toggle failed", () =>
      db
        .update(geoSettings)
        .set({ pausedAutoPromptIds })
        .where(eq(geoSettings.projectId, scope.projectId))
    );
    const result: GeoAutoPromptToggleResult = {
      promptId,
      enabled,
      pausedAutoPromptIds,
    };
    return result;
  }
);

export const toggleGeoPrompt = Effect.fn("geo.promptsToggle")(function* (
  input: GeoScopeInput,
  promptId: string,
  enabled: boolean
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("prompt toggle failed", () =>
    db
      .update(geoPrompts)
      .set({ enabled })
      .where(
        and(
          eq(geoPrompts.id, promptId),
          eq(geoPrompts.organizationId, scope.organizationId),
          eq(geoPrompts.projectId, scope.projectId)
        )
      )
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(new GeoPromptNotFoundError({ promptId }));
  }

  return toTrackedPrompt(row);
});

export const startGeoScanScoped = Effect.fn("geo.startScanScoped")(function* (
  input: GeoScopeInput,
  promptIds?: readonly string[],
  engines?: readonly string[]
) {
  const scope = yield* requireGeoProject(input);
  const projectId = scope.projectId;
  const row = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      columns: { id: true, enabled: true, engines: true },
      where: eq(geoSettings.projectId, projectId),
    })
  );

  if (!row) {
    return yield* Effect.fail(
      new GeoSettingsMissingError({ organizationId: scope.organizationId })
    );
  }

  if (!row.enabled) {
    return yield* Effect.fail(new GeoSettingsDisabledError({ projectId }));
  }

  const storedEngines = row.engines ?? [];
  if (
    engines &&
    storedEngines.length > 0 &&
    scopeGeoScanEngines(storedEngines, engines).length === 0
  ) {
    return yield* Effect.fail(new GeoScanEnginesEmptyError({ projectId }));
  }

  // Claim the scan slot atomically *before* handing off. Reading the settings
  // row and checking `isGeoScanRunning` cannot serialize anything: concurrent
  // triggers (public API, dashboard, cron sweep) all read "idle" before
  // any of them stamps, and all of them start a scan the organization pays
  // for. Losing the claim means someone else is already scanning.
  const claim = yield* claimGeoScanRun(projectId);
  if (!claim) {
    return yield* Effect.fail(new GeoScanAlreadyRunningError({ projectId }));
  }

  // The hand-off creates the `geo_scans` row the caller polls, carries the
  // claim token, and owns the rules for a failed start (definite refusal
  // releases the claim and fails the row, unknown outcome holds both).
  return yield* startClaimedGeoScanRun(
    scope.organizationId,
    projectId,
    claim.claimedAt,
    promptIds,
    engines
  );
});

export const startGeoScan = Effect.fn("geo.startScan")(function* (
  input: GeoScanStartInput
) {
  return yield* startGeoScanScoped(input, undefined, input.engines);
});

export const startGeoPromptRescan = Effect.fn("geo.rescanPrompt")(function* (
  input: GeoPromptRescanInput
) {
  return yield* startGeoScanScoped(input, [input.promptId]);
});
