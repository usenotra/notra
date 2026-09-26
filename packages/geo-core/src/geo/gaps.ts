import type { GeoPlannerGapPrompt } from "@notra/ai/types/geo-writer";
import { db } from "@notra/db/drizzle";
import {
  brandSitemapPages,
  brandSitemaps,
  geoCompetitors,
  geoContentBriefs,
  geoMentionChecks,
  geoPromptSuggestions,
  geoPrompts,
  geoSettings,
  posts,
} from "@notra/db/schema";
import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_AI_SEARCH_GAP_MAX_QUERIES,
  GEO_AI_SEARCH_GAP_MIN_SEARCHES,
  GEO_AI_SEARCH_GAP_PROMPT_LIMIT,
  GEO_AI_SEARCH_GAP_VARIANT_LIMIT,
  GEO_COLLISION_POST_CONTENT_TYPE,
  GEO_COLLISION_POST_LIMIT,
  GEO_COLLISION_SITEMAP_PAGE_LIMIT,
  GEO_GAPS_ENGINE_QUERY_LIMIT,
  GEO_GAPS_MAX_CHECKS,
  GEO_GAPS_SEARCH_LIMIT,
  GEO_WRITER_GAP_LOOKBACK_DAYS,
  GEO_WRITER_PLANNER_GAP_LIMIT,
} from "../constants/geo";
import type {
  GeoAiSearchAgg,
  GeoAiSearchGapRow,
  GeoAiSearchQueryDbRow,
  GeoAiSearchQueryRow,
  GeoContentCollisionCandidate,
  GeoContentGapsResponse,
  GeoGapBriefRef,
  GeoGapScore,
  GeoPromptGapIgnoreInput,
  GeoPromptGapRow,
  GeoScopeInput,
  GeoSearchGapRecommendation,
  GeoSearchGapRow,
  GeoSuggestionKeyword,
} from "../types/geo";
import { competitorCanonicalMap } from "../utils/geo-competitor-names";
import {
  recommendSearchGapAction,
  scoreContentCollisions,
} from "../utils/geo-content-collision";
import {
  aiSearchGapId,
  aiSearchGroupKey,
  gapOpportunityScore,
  interleaveSearchQueries,
  isMissingMajority,
  searchGapClicks,
  searchGapImpressions,
  searchGapPosition,
  toGapBriefBaseline,
} from "../utils/geo-gaps";
import { competitorKey } from "./domain";
import { geoDb } from "./effect";
import { GeoSettingsMissingError } from "./errors";
import { requireGeoProject } from "./projects";
import {
  activeGapScanFilter,
  findPromptMentionEntry,
  gapScanIds,
  shouldSkipUnmatchedGapScan,
} from "./prompts";
import {
  buildBrandTerms,
  isNavigationalQuery,
  promptMentionsBrand,
} from "./suggestion-keywords";

const MS_PER_DAY = 86_400_000;

interface GapBriefRow {
  id: string;
  status: GeoContentBriefStatus;
  postId: string | null;
  sourceKind: string;
  sourceId: string | null;
  workingTitle: string;
  baseline: unknown;
  publishedAt: Date | null;
  rescanScanId: string | null;
}

interface PromptGapAgg {
  promptText: string;
  total: number;
  mentioned: number;
  missing: string[];
  mentionedEngines: string[];
  competitors: string[];
  searchQueriesByEngine: string[][];
}

function toBriefRef(row: GapBriefRow | undefined): GeoGapBriefRef | null {
  if (!row) {
    return null;
  }
  return {
    briefId: row.id,
    status: row.status,
    postId: row.postId,
    workingTitle: row.workingTitle,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    baseline: toGapBriefBaseline(row.baseline),
    rescanned: row.rescanScanId !== null,
  };
}

function sourceKey(kind: string, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

function splitGapCompetitors(
  names: readonly string[],
  trackedAliases: Map<string, string>
): { tracked: string[]; discovered: string[] } {
  const tracked: string[] = [];
  const discovered: string[] = [];
  const seenTracked = new Set<string>();
  const seenDiscovered = new Set<string>();
  for (const name of names) {
    const key = competitorKey(name);
    if (key.length === 0) {
      continue;
    }
    const canonical = trackedAliases.get(key);
    if (canonical) {
      if (!seenTracked.has(canonical)) {
        seenTracked.add(canonical);
        tracked.push(canonical);
      }
      continue;
    }
    if (!seenDiscovered.has(key)) {
      seenDiscovered.add(key);
      discovered.push(name.trim());
    }
  }
  return { tracked, discovered };
}

function lookbackSince(): Date {
  return new Date(Date.now() - GEO_WRITER_GAP_LOOKBACK_DAYS * MS_PER_DAY);
}

function recentFirstTurnChecks(projectId: string) {
  return and(
    eq(geoMentionChecks.projectId, projectId),
    eq(geoMentionChecks.turn, 0),
    gte(geoMentionChecks.capturedAt, lookbackSince())
  );
}

function scoreGap(
  input: { competitors: readonly string[]; mentioned: number; total: number },
  trackedAliases: Map<string, string>
): GeoGapScore {
  const { tracked, discovered } = splitGapCompetitors(
    input.competitors,
    trackedAliases
  );
  const ownMentionRate = input.mentioned / input.total;
  return {
    competitors: tracked,
    discoveredCompetitors: discovered,
    ownMentionRate,
    opportunity: gapOpportunityScore({
      ownMentionRate,
      competitorCount: tracked.length + discovered.length,
      engineCoverage: input.total,
    }),
  };
}

const loadMentionGapInputs = Effect.fn("geo.mentionGapInputs")(function* (
  projectId: string
) {
  const [checks, prompts, settingsRow] = yield* Effect.all([
    geoDb("mention checks lookup failed", () =>
      db
        .selectDistinctOn(
          [geoMentionChecks.promptId, geoMentionChecks.engine],
          {
            promptId: geoMentionChecks.promptId,
            engine: geoMentionChecks.engine,
            prompt: geoMentionChecks.prompt,
            mentioned: geoMentionChecks.mentioned,
            competitors: geoMentionChecks.competitors,
            grounding: geoMentionChecks.grounding,
          }
        )
        .from(geoMentionChecks)
        .where(recentFirstTurnChecks(projectId))
        .orderBy(
          geoMentionChecks.promptId,
          geoMentionChecks.engine,
          desc(geoMentionChecks.capturedAt)
        )
        .limit(GEO_GAPS_MAX_CHECKS)
    ),
    geoDb("prompts lookup failed", () =>
      db
        .select({
          id: geoPrompts.id,
          prompt: geoPrompts.prompt,
          title: geoPrompts.title,
        })
        .from(geoPrompts)
        .where(
          and(eq(geoPrompts.projectId, projectId), eq(geoPrompts.enabled, true))
        )
        .orderBy(desc(geoPrompts.createdAt))
    ),
    geoDb("settings lookup failed", () =>
      db.query.geoSettings.findFirst({
        columns: {
          companyName: true,
          aliases: true,
          removedAutoPromptIds: true,
          ignoredGapPromptIds: true,
          competitors: true,
        },
        where: eq(geoSettings.projectId, projectId),
      })
    ),
  ]);
  return {
    checks,
    prompts,
    removedAutoPromptIds: new Set(settingsRow?.removedAutoPromptIds ?? []),
    ignoredGapPromptIds: new Set(settingsRow?.ignoredGapPromptIds ?? []),
    settingsCompetitors: settingsRow?.competitors ?? [],
    brandTerms: buildBrandTerms(settingsRow),
  };
});

const loadAiSearchQueries = Effect.fn("geo.gaps.aiSearchQueries")(function* (
  projectId: string,
  matchedScanIds: readonly string[],
  removedAutoPromptIds: readonly string[]
) {
  const queries = sql`${geoMentionChecks.grounding}->'queries'`;
  const result = yield* geoDb("AI search queries lookup failed", () =>
    db.execute<GeoAiSearchQueryDbRow>(sql`
      with searched as (
        select
          ${geoMentionChecks.id} as check_id,
          ${geoMentionChecks.engine} as engine,
          ${geoMentionChecks.prompt} as prompt,
          ${geoMentionChecks.mentioned} as mentioned,
          ${geoMentionChecks.ownedSourceCited} as owned_source_cited,
          ${geoMentionChecks.competitors} as competitors,
          btrim(searched_query.value) as query
        from ${geoMentionChecks}
        cross join lateral jsonb_array_elements_text(
          case when jsonb_typeof(${queries}) = 'array' then ${queries} else '[]'::jsonb end
        ) as searched_query(value)
        where ${recentFirstTurnChecks(projectId)}
          and ${activeGapScanFilter(
            geoMentionChecks.promptId,
            matchedScanIds,
            removedAutoPromptIds
          )}
      )
      select
        mode() within group (order by query) as query,
        array_agg(distinct check_id) as check_ids,
        coalesce(array_agg(distinct check_id) filter (where mentioned), '{}') as mentioned_check_ids,
        coalesce(array_agg(distinct check_id) filter (where mentioned or owned_source_cited), '{}') as covered_check_ids,
        array_agg(distinct engine) as engines,
        array_agg(distinct prompt) as prompts,
        coalesce(jsonb_agg(distinct to_jsonb(competitors)) filter (where not mentioned), '[]'::jsonb) as competitors
      from searched
      where query <> ''
      group by lower(query)
      order by count(distinct check_id) desc
      limit ${GEO_AI_SEARCH_GAP_MAX_QUERIES}
    `)
  );
  return result.rows.map((row: GeoAiSearchQueryDbRow): GeoAiSearchQueryRow => ({
    query: row.query,
    checkIds: row.check_ids,
    mentionedCheckIds: row.mentioned_check_ids,
    coveredCheckIds: row.covered_check_ids,
    engines: row.engines,
    prompts: row.prompts,
    competitors: row.competitors,
  }));
});

function aggregateMentionChecks(
  checks: Array<{
    promptId: string;
    prompt: string;
    mentioned: boolean;
    engine: string;
    competitors: string[];
    grounding: { queries: string[] };
  }>
): Map<string, PromptGapAgg> {
  const byPrompt = new Map<string, PromptGapAgg>();
  for (const check of checks) {
    const entry = byPrompt.get(check.promptId) ?? {
      promptText: check.prompt,
      total: 0,
      mentioned: 0,
      missing: [] as string[],
      mentionedEngines: [] as string[],
      competitors: [] as string[],
      searchQueriesByEngine: [] as string[][],
    };
    entry.total += 1;
    entry.searchQueriesByEngine.push(check.grounding.queries);
    if (check.mentioned) {
      entry.mentioned += 1;
      entry.mentionedEngines.push(check.engine);
    } else {
      entry.missing.push(check.engine);
      entry.competitors.push(...check.competitors);
    }
    byPrompt.set(check.promptId, entry);
  }
  return byPrompt;
}

function aggregateAiSearches(
  rows: readonly GeoAiSearchQueryRow[],
  brandTerms: string[]
): Map<string, GeoAiSearchAgg> {
  const byKey = new Map<string, GeoAiSearchAgg>();
  for (const row of rows) {
    const key = aiSearchGroupKey(row.query);
    if (
      key.length === 0 ||
      isNavigationalQuery(row.query) ||
      promptMentionsBrand(row.query, brandTerms)
    ) {
      continue;
    }
    const entry = byKey.get(key) ?? {
      variants: new Map<string, number>(),
      prompts: new Set<string>(),
      engines: new Set<string>(),
      checkIds: new Set<string>(),
      mentionedCheckIds: new Set<string>(),
      coveredCheckIds: new Set<string>(),
      competitors: [] as string[],
    };
    entry.variants.set(
      row.query,
      (entry.variants.get(row.query) ?? 0) + row.checkIds.length
    );
    addAll(entry.prompts, row.prompts);
    addAll(entry.engines, row.engines);
    addAll(entry.checkIds, row.checkIds);
    addAll(entry.mentionedCheckIds, row.mentionedCheckIds);
    addAll(entry.coveredCheckIds, row.coveredCheckIds);
    entry.competitors.push(...row.competitors.flat());
    byKey.set(key, entry);
  }
  return byKey;
}

function addAll<T>(target: Set<T>, values: readonly T[]): void {
  for (const value of values) {
    target.add(value);
  }
}

function toAiSearchGapRows(
  byKey: Map<string, GeoAiSearchAgg>,
  trackedAliases: Map<string, string>,
  briefFor: (key: string) => GapBriefRow | undefined
): GeoAiSearchGapRow[] {
  const rows: GeoAiSearchGapRow[] = [];
  for (const [key, entry] of byKey) {
    const searches = entry.checkIds.size;
    if (
      searches < GEO_AI_SEARCH_GAP_MIN_SEARCHES ||
      !isMissingMajority(searches - entry.coveredCheckIds.size, searches)
    ) {
      continue;
    }
    const [query = key, ...variants] = [...entry.variants.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([variant]) => variant);
    const id = aiSearchGapId(key, entry.variants.keys());
    rows.push({
      id,
      query,
      variants: variants.slice(0, GEO_AI_SEARCH_GAP_VARIANT_LIMIT),
      prompts: [...entry.prompts].slice(0, GEO_AI_SEARCH_GAP_PROMPT_LIMIT),
      engines: [...entry.engines],
      searches,
      ...scoreGap(
        {
          competitors: entry.competitors,
          mentioned: entry.mentionedCheckIds.size,
          total: searches,
        },
        trackedAliases
      ),
      brief: toBriefRef(briefFor(id)),
    });
  }
  return rows
    .sort((left, right) => right.opportunity - left.opportunity)
    .slice(0, GEO_GAPS_SEARCH_LIMIT);
}

function forEachMissingMajorityGap(
  prompts: Array<{ id: string; prompt: string; title: string | null }>,
  byPrompt: Map<string, PromptGapAgg>,
  removedAutoPromptIds: ReadonlySet<string>,
  onGap: (
    id: string,
    prompt: string,
    title: string | null,
    entry: PromptGapAgg
  ) => void
) {
  const matchedScanIds = new Set<string>();
  for (const prompt of prompts) {
    const entry = findPromptMentionEntry(byPrompt, prompt.id);
    if (!entry) {
      continue;
    }
    for (const scanId of gapScanIds(prompt.id)) {
      matchedScanIds.add(scanId);
    }
    if (isMissingMajority(entry.missing.length, entry.total)) {
      onGap(prompt.id, prompt.prompt, prompt.title, entry);
    }
  }
  for (const [scanId, entry] of byPrompt) {
    if (
      shouldSkipUnmatchedGapScan(scanId, matchedScanIds, removedAutoPromptIds)
    ) {
      continue;
    }
    if (isMissingMajority(entry.missing.length, entry.total)) {
      onGap(scanId, entry.promptText, null, entry);
    }
  }
}

function forEachWonGapWithBrief(
  prompts: Array<{ id: string; prompt: string; title: string | null }>,
  byPrompt: Map<string, PromptGapAgg>,
  hasBrief: (id: string) => boolean,
  onGap: (
    id: string,
    prompt: string,
    title: string | null,
    entry: PromptGapAgg
  ) => void
) {
  for (const prompt of prompts) {
    const entry = findPromptMentionEntry(byPrompt, prompt.id);
    if (
      !entry ||
      isMissingMajority(entry.missing.length, entry.total) ||
      !hasBrief(prompt.id)
    ) {
      continue;
    }
    onGap(prompt.id, prompt.prompt, prompt.title, entry);
  }
}

export const loadPlannerGapPrompts = Effect.fn("geo.plannerGaps")(function* (
  projectId: string
) {
  const { checks, prompts, removedAutoPromptIds, ignoredGapPromptIds } =
    yield* loadMentionGapInputs(projectId);
  const byPrompt = aggregateMentionChecks(checks);
  const gaps: GeoPlannerGapPrompt[] = [];
  forEachMissingMajorityGap(
    prompts,
    byPrompt,
    removedAutoPromptIds,
    (id, prompt, _title, entry) => {
      if (
        ignoredGapPromptIds.has(id) ||
        gaps.length >= GEO_WRITER_PLANNER_GAP_LIMIT
      ) {
        return;
      }
      gaps.push({ prompt, engines: entry.missing });
    }
  );
  return { gaps };
});

const loadCollisionCandidates = Effect.fn("geo.gaps.collisionCandidates")(
  function* (scope: { organizationId: string; brandSettingsId: string }) {
    const [latestSitemap, postRows] = yield* Effect.all([
      geoDb("latest sitemap lookup failed", () =>
        db
          .select({ id: brandSitemaps.id })
          .from(brandSitemaps)
          .where(
            and(
              eq(brandSitemaps.brandSettingsId, scope.brandSettingsId),
              eq(brandSitemaps.status, "ready")
            )
          )
          .orderBy(desc(brandSitemaps.updatedAt))
          .limit(1)
      ),
      geoDb("posts lookup failed", () =>
        db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            htmlUrl: posts.htmlUrl,
          })
          .from(posts)
          .where(
            and(
              eq(posts.organizationId, scope.organizationId),
              eq(posts.contentType, GEO_COLLISION_POST_CONTENT_TYPE)
            )
          )
          .orderBy(desc(posts.updatedAt))
          .limit(GEO_COLLISION_POST_LIMIT)
      ),
    ]);
    const sitemapId = latestSitemap[0]?.id;
    const pageRows = sitemapId
      ? yield* geoDb("sitemap pages lookup failed", () =>
          db
            .select({
              id: brandSitemapPages.id,
              url: brandSitemapPages.url,
              title: brandSitemapPages.title,
            })
            .from(brandSitemapPages)
            .where(
              and(
                eq(brandSitemapPages.sitemapId, sitemapId),
                eq(brandSitemapPages.category, "crawled")
              )
            )
            .orderBy(sql`${brandSitemapPages.wordCount} desc nulls last`)
            .limit(GEO_COLLISION_SITEMAP_PAGE_LIMIT)
        )
      : [];
    const candidates: GeoContentCollisionCandidate[] = [];
    for (const page of pageRows) {
      candidates.push({
        kind: "page",
        id: page.id,
        url: page.url,
        title: page.title,
        slug: null,
      });
    }
    for (const post of postRows) {
      candidates.push({
        kind: "post",
        id: post.id,
        url: post.htmlUrl,
        title: post.title,
        slug: post.slug,
      });
    }
    return candidates;
  }
);

function searchGapRecommendation(
  suggestion: {
    prompt: string;
    title: string | null;
    sourceKeywords: GeoSuggestionKeyword[] | null;
  },
  candidates: readonly GeoContentCollisionCandidate[]
): GeoSearchGapRecommendation {
  const keywords = [...(suggestion.sourceKeywords ?? [])].sort(
    (left, right) => right.impressions - left.impressions
  );
  const matches = scoreContentCollisions(
    {
      prompt: suggestion.prompt,
      title: suggestion.title,
      queries: keywords.map((keyword) => keyword.query),
    },
    candidates
  );
  return recommendSearchGapAction({
    matches,
    impressions: searchGapImpressions(suggestion.sourceKeywords),
    clicks: searchGapClicks(suggestion.sourceKeywords),
  });
}

export const loadGeoContentGaps = Effect.fn("geo.gaps")(function* (
  input: GeoScopeInput
) {
  const scope = yield* requireGeoProject(input);
  const projectId = scope.projectId;

  const [
    { aiSearchChecks, ...mentionInputs },
    pending,
    briefs,
    competitorRows,
    collisionCandidates,
  ] = yield* Effect.all([
    loadMentionGapInputs(projectId).pipe(
      Effect.flatMap((inputs) =>
        loadAiSearchQueries(
          projectId,
          inputs.prompts.flatMap((prompt) => gapScanIds(prompt.id)),
          [...inputs.removedAutoPromptIds]
        ).pipe(Effect.map((checks) => ({ ...inputs, aiSearchChecks: checks })))
      )
    ),
    geoDb("prompt suggestions lookup failed", () =>
      db
        .select({
          id: geoPromptSuggestions.id,
          prompt: geoPromptSuggestions.prompt,
          title: geoPromptSuggestions.title,
          sourceKeywords: geoPromptSuggestions.sourceKeywords,
        })
        .from(geoPromptSuggestions)
        .where(
          and(
            eq(geoPromptSuggestions.organizationId, scope.organizationId),
            eq(geoPromptSuggestions.projectId, projectId),
            eq(geoPromptSuggestions.status, "pending")
          )
        )
        .orderBy(desc(geoPromptSuggestions.createdAt))
        .limit(GEO_GAPS_SEARCH_LIMIT)
    ),
    geoDb("briefs lookup failed", () =>
      db
        .selectDistinctOn(
          [geoContentBriefs.sourceKind, geoContentBriefs.sourceId],
          {
            id: geoContentBriefs.id,
            status: geoContentBriefs.status,
            postId: geoContentBriefs.postId,
            sourceKind: geoContentBriefs.sourceKind,
            sourceId: geoContentBriefs.sourceId,
            workingTitle: sql<string>`${geoContentBriefs.brief}->>'workingTitle'`,
            baseline: sql<unknown>`${geoContentBriefs.brief}->'baseline'`,
            publishedAt: geoContentBriefs.publishedAt,
            rescanScanId: geoContentBriefs.rescanScanId,
          }
        )
        .from(geoContentBriefs)
        .where(
          and(
            eq(geoContentBriefs.projectId, projectId),
            inArray(geoContentBriefs.sourceKind, [
              "gap",
              "search_console",
              "ai_search",
            ]),
            isNotNull(geoContentBriefs.sourceId)
          )
        )
        .orderBy(
          geoContentBriefs.sourceKind,
          geoContentBriefs.sourceId,
          desc(geoContentBriefs.updatedAt)
        )
    ),
    geoDb("competitors lookup failed", () =>
      db
        .select({
          name: geoCompetitors.name,
          synonyms: geoCompetitors.synonyms,
        })
        .from(geoCompetitors)
        .where(eq(geoCompetitors.projectId, projectId))
    ),
    loadCollisionCandidates(scope),
  ]);
  // `loadMentionGapInputs` already read this project's geo_settings row.
  const {
    checks,
    prompts,
    removedAutoPromptIds,
    ignoredGapPromptIds,
    settingsCompetitors,
    brandTerms,
  } = mentionInputs;

  const trackedAliases = competitorCanonicalMap([
    ...competitorRows,
    ...settingsCompetitors.map((name) => ({
      name,
      synonyms: [] as string[],
    })),
  ]);

  const briefBySource = new Map<string, GapBriefRow>();
  for (const brief of briefs) {
    if (!brief.sourceId) {
      continue;
    }
    briefBySource.set(sourceKey(brief.sourceKind, brief.sourceId), brief);
  }

  const byPrompt = aggregateMentionChecks(checks);
  const promptGaps: GeoPromptGapRow[] = [];

  const pushPromptGap = (
    id: string,
    prompt: string,
    title: string | null,
    entry: PromptGapAgg,
    won: boolean
  ) => {
    if (ignoredGapPromptIds.has(id)) {
      return;
    }
    const score = scoreGap(entry, trackedAliases);
    promptGaps.push({
      id,
      prompt,
      title,
      engines: entry.missing,
      mentionedEngines: entry.mentionedEngines,
      ...score,
      searchQueries: interleaveSearchQueries(
        entry.searchQueriesByEngine,
        GEO_GAPS_ENGINE_QUERY_LIMIT
      ),
      engineCoverage: entry.total,
      opportunity: won ? 0 : score.opportunity,
      won,
      brief: toBriefRef(briefBySource.get(sourceKey("gap", id))),
    });
  };
  forEachMissingMajorityGap(
    prompts,
    byPrompt,
    removedAutoPromptIds,
    (id, prompt, title, entry) => {
      pushPromptGap(id, prompt, title, entry, false);
    }
  );
  forEachWonGapWithBrief(
    prompts,
    byPrompt,
    (id) => {
      const brief = briefBySource.get(sourceKey("gap", id));
      return brief ? toGapBriefBaseline(brief.baseline) !== null : false;
    },
    (id, prompt, title, entry) => {
      pushPromptGap(id, prompt, title, entry, true);
    }
  );
  promptGaps.sort((a, b) => b.opportunity - a.opportunity);

  const searchGaps: GeoSearchGapRow[] = pending.map((suggestion) => ({
    id: suggestion.id,
    prompt: suggestion.prompt,
    title: suggestion.title,
    impressions: searchGapImpressions(suggestion.sourceKeywords),
    clicks: searchGapClicks(suggestion.sourceKeywords),
    position: searchGapPosition(suggestion.sourceKeywords),
    queries: suggestion.sourceKeywords ?? [],
    brief: toBriefRef(
      briefBySource.get(sourceKey("search_console", suggestion.id))
    ),
    recommendation: searchGapRecommendation(suggestion, collisionCandidates),
  }));

  const aiSearchGaps = toAiSearchGapRows(
    aggregateAiSearches(aiSearchChecks, brandTerms),
    trackedAliases,
    (key) => briefBySource.get(sourceKey("ai_search", key))
  );

  const response: GeoContentGapsResponse = {
    promptGaps,
    searchGaps,
    aiSearchGaps,
    hasScanData: checks.length > 0,
  };
  return response;
});

export const setGeoPromptGapIgnored = Effect.fn("geo.gaps.ignore")(function* (
  input: GeoPromptGapIgnoreInput
) {
  const scope = yield* requireGeoProject(input);
  const column = geoSettings.ignoredGapPromptIds;
  const next = input.ignored
    ? sql`CASE WHEN ${input.promptId} = ANY(${column}) THEN ${column} ELSE array_append(${column}, ${input.promptId}) END`
    : sql`array_remove(${column}, ${input.promptId})`;
  const updated = yield* geoDb("ignore prompt gap failed", () =>
    db
      .update(geoSettings)
      .set({ ignoredGapPromptIds: next })
      .where(eq(geoSettings.projectId, scope.projectId))
      .returning({ id: geoSettings.id })
  );
  if (updated.length === 0) {
    return yield* Effect.fail(
      new GeoSettingsMissingError({ organizationId: scope.organizationId })
    );
  }
  return { promptId: input.promptId, ignored: input.ignored };
});
