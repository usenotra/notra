import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";

import { GEO_CHECK_ENGLISH_LANGUAGES } from "../constants/geo-checks";
import { db } from "../drizzle";
import { geoMentionChecks, geoScans } from "../schema";
import type {
  GeoCheckCompetitorPromptRow,
  GeoCheckCompetitorShareRow,
  GeoCheckCompetitorShareTimeseriesRow,
  GeoCheckCompetitorShareTrendRow,
  GeoCheckCompetitorTimeseriesRow,
  GeoCheckFilterOptions,
  GeoCheckLanguageShareRow,
  GeoCheckLanguageShareTrendRow,
  GeoCheckOverviewRow,
  GeoCheckPromptHistoryQuery,
  GeoCheckPromptHistoryRow,
  GeoCheckPromptResultRow,
  GeoCheckPromptSummaryRow,
  GeoCheckScanComparison,
  GeoCheckScanComparisonInput,
  GeoCheckScanComparisonRow,
  GeoCheckScope,
  GeoCheckSequenceResultRow,
  GeoCheckTimeseriesRow,
  GeoCheckWindow,
  GeoCheckWindowInput,
  GeoCheckWrite,
} from "../types/geo-checks";
import { parseGeoCheckGrounding } from "./geo-grounding";

const CHECK_INSERT_CHUNK = 250;

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(String(value));
}

function toDay(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return toDate(value).toISOString().slice(0, 10);
}

function scopeWhere(scope: GeoCheckScope): SQL {
  if (scope.projectId) {
    return and(
      eq(geoMentionChecks.organizationId, scope.organizationId),
      eq(geoMentionChecks.projectId, scope.projectId)
    ) as SQL;
  }
  return eq(geoMentionChecks.organizationId, scope.organizationId);
}

const DAY_MS = 86_400_000;

export function toGeoCheckWindow(
  input: GeoCheckWindowInput | undefined
): GeoCheckWindow | undefined {
  if (!input) {
    return;
  }
  if (input.from) {
    const from = new Date(`${input.from}T00:00:00.000Z`);
    const toExclusive = input.to
      ? new Date(new Date(`${input.to}T00:00:00.000Z`).getTime() + DAY_MS)
      : undefined;
    return { from, toExclusive };
  }
  if (input.days === undefined) {
    return;
  }
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - input.days);
  return { from };
}

function capturedWithin(window: GeoCheckWindow | undefined): SQL[] {
  if (!window) {
    return [];
  }
  const parts: SQL[] = [];
  if (window.from) {
    parts.push(gte(geoMentionChecks.capturedAt, window.from));
  }
  if (window.toExclusive) {
    parts.push(lt(geoMentionChecks.capturedAt, window.toExclusive));
  }
  return parts;
}

function mentionOptionFilters(options?: GeoCheckFilterOptions): SQL[] {
  const parts: SQL[] = [];
  if (options?.sequences === "single") {
    parts.push(isNull(geoMentionChecks.sequenceId));
  }
  if (options?.englishOnly) {
    parts.push(
      inArray(geoMentionChecks.language, [...GEO_CHECK_ENGLISH_LANGUAGES])
    );
  }
  return parts;
}

function mentionFilters(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  options?: GeoCheckFilterOptions
): SQL {
  return and(
    scopeWhere(scope),
    ...capturedWithin(window),
    ...mentionOptionFilters(options)
  ) as SQL;
}

export async function insertGeoMentionChecks(
  rows: GeoCheckWrite[]
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  let written = 0;
  for (let index = 0; index < rows.length; index += CHECK_INSERT_CHUNK) {
    const chunk = rows.slice(index, index + CHECK_INSERT_CHUNK).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      organizationId: row.organizationId,
      projectId: row.projectId,
      scanId: row.scanId,
      engine: row.engine,
      promptId: row.promptId,
      sequenceId: row.sequenceId ?? null,
      turn: row.turn ?? 0,
      prompt: row.prompt,
      answer: row.answer,
      mentioned: row.mentioned,
      position: row.position,
      sentiment: row.sentiment,
      competitors: row.competitors,
      excerpt: row.excerpt,
      grounding: row.grounding,
      language: row.language,
      sources: row.sources ?? [],
      finishReason: row.finishReason,
      promptTokens: row.promptTokens,
      outputTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
      zdrEnforced: row.zdrEnforced ?? null,
      capturedAt: row.capturedAt,
    }));
    const inserted = await db
      .insert(geoMentionChecks)
      .values(chunk)
      .onConflictDoNothing({
        target: [
          geoMentionChecks.scanId,
          geoMentionChecks.engine,
          geoMentionChecks.promptId,
          geoMentionChecks.turn,
          geoMentionChecks.language,
        ],
      })
      .returning({ id: geoMentionChecks.id });
    written += inserted.length;
  }
  return written;
}

export async function queryGeoCheckOverview(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckOverviewRow[]> {
  const rows = await db
    .select({
      engine: geoMentionChecks.engine,
      checks: sql<number>`count(*)::int`,
      mentions: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})::int`,
      mentionRate: sql<number>`round(count(*) filter (where ${geoMentionChecks.mentioned})::numeric / nullif(count(*), 0), 3)::float8`,
      avgPosition: sql<
        number | null
      >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
      lastCheckedAt: sql<Date>`max(${geoMentionChecks.capturedAt})`,
    })
    .from(geoMentionChecks)
    .where(
      mentionFilters(scope, window, { sequences: "single", englishOnly: true })
    )
    .groupBy(geoMentionChecks.engine)
    .orderBy(
      sql`count(*) filter (where ${geoMentionChecks.mentioned})::numeric / nullif(count(*), 0) desc`
    );

  return rows.map((row) => ({
    engine: row.engine,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    mentionRate: toNumber(row.mentionRate),
    avgPosition: toNullableNumber(row.avgPosition),
    lastCheckedAt: toDate(row.lastCheckedAt),
  }));
}

export async function queryGeoCheckTimeseries(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  options?: GeoCheckFilterOptions
): Promise<GeoCheckTimeseriesRow[]> {
  const rows = await db
    .select({
      day: sql<string>`(${geoMentionChecks.capturedAt})::date`,
      engine: geoMentionChecks.engine,
      checks: sql<number>`count(*)::int`,
      mentions: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})::int`,
      avgPosition: sql<
        number | null
      >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
    })
    .from(geoMentionChecks)
    .where(
      mentionFilters(scope, window, {
        ...options,
        englishOnly: options?.englishOnly ?? true,
      })
    )
    .groupBy(
      sql`(${geoMentionChecks.capturedAt})::date`,
      geoMentionChecks.engine
    )
    .orderBy(sql`(${geoMentionChecks.capturedAt})::date asc`);

  return rows.map((row) => ({
    day: toDay(row.day),
    engine: row.engine,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    avgPosition: toNullableNumber(row.avgPosition),
  }));
}

const promptResultColumns = {
  promptId: geoMentionChecks.promptId,
  engine: geoMentionChecks.engine,
  prompt: geoMentionChecks.prompt,
  answer: geoMentionChecks.answer,
  mentioned: geoMentionChecks.mentioned,
  position: geoMentionChecks.position,
  sentiment: geoMentionChecks.sentiment,
  competitors: geoMentionChecks.competitors,
  excerpt: geoMentionChecks.excerpt,
  grounding: geoMentionChecks.grounding,
  sources: geoMentionChecks.sources,
  finishReason: geoMentionChecks.finishReason,
  promptTokens: geoMentionChecks.promptTokens,
  outputTokens: geoMentionChecks.outputTokens,
  reasoningTokens: geoMentionChecks.reasoningTokens,
  lastCheckedAt: geoMentionChecks.capturedAt,
};

type GeoCheckPromptResultSelect = Omit<
  GeoCheckPromptResultRow,
  "grounding" | "truncated"
> & { grounding: unknown };

function toPromptResultRow(
  row: GeoCheckPromptResultSelect
): GeoCheckPromptResultRow {
  return {
    ...row,
    grounding: parseGeoCheckGrounding(row.grounding),
    truncated: row.finishReason === null ? null : row.finishReason === "length",
  };
}

export async function queryGeoCheckPromptResults(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  limit?: number
): Promise<GeoCheckPromptResultRow[]> {
  // Every field must come from the same newest row per (prompt, engine).
  // Aggregating across the window would pair a current answer with a stale
  // mention flag or position.
  const latestPromptResults = db
    .selectDistinctOn(
      [geoMentionChecks.promptId, geoMentionChecks.engine],
      promptResultColumns
    )
    .from(geoMentionChecks)
    .where(
      mentionFilters(scope, window, {
        sequences: "single",
        englishOnly: true,
      })
    )
    .orderBy(
      geoMentionChecks.promptId,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    )
    .as("latest_geo_prompt_results");

  const orderedQuery = db
    .select()
    .from(latestPromptResults)
    .orderBy(
      desc(latestPromptResults.lastCheckedAt),
      latestPromptResults.promptId,
      latestPromptResults.engine
    );
  const rows =
    limit === undefined ? await orderedQuery : await orderedQuery.limit(limit);

  return rows.map(toPromptResultRow);
}

/**
 * Loads one check by primary key. The organization filter is the authorization
 * boundary: a check id from another organization resolves to `null`.
 */
export async function queryGeoCheckById(
  checkId: string,
  organizationId: string
): Promise<GeoCheckPromptResultRow | null> {
  const [row] = await db
    .select(promptResultColumns)
    .from(geoMentionChecks)
    .where(
      and(
        eq(geoMentionChecks.id, checkId),
        eq(geoMentionChecks.organizationId, organizationId)
      )
    )
    .limit(1);

  return row ? toPromptResultRow(row) : null;
}

export async function queryGeoCheckPromptSummaries(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckPromptSummaryRow[]> {
  // Deliberately omits answer/grounding/sources/token counts: the list only
  // needs mention state, and those columns dominate the payload size.
  const latest = db
    .selectDistinctOn([geoMentionChecks.promptId, geoMentionChecks.engine], {
      checkId: geoMentionChecks.id,
      promptId: geoMentionChecks.promptId,
      engine: geoMentionChecks.engine,
      prompt: geoMentionChecks.prompt,
      mentioned: geoMentionChecks.mentioned,
      position: geoMentionChecks.position,
      sentiment: geoMentionChecks.sentiment,
      competitors: geoMentionChecks.competitors,
      lastCheckedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(
      mentionFilters(scope, window, { sequences: "single", englishOnly: true })
    )
    .orderBy(
      geoMentionChecks.promptId,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    )
    .as("latest_geo_prompt_summaries");

  return await db
    .select()
    .from(latest)
    .orderBy(desc(latest.lastCheckedAt), latest.promptId, latest.engine);
}

export async function queryGeoCheckPromptHistory(
  scope: GeoCheckScope,
  query: GeoCheckPromptHistoryQuery
): Promise<GeoCheckPromptHistoryRow[]> {
  if (query.promptIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: geoMentionChecks.id,
      scanId: geoMentionChecks.scanId,
      engine: geoMentionChecks.engine,
      mentioned: geoMentionChecks.mentioned,
      position: geoMentionChecks.position,
      sentiment: geoMentionChecks.sentiment,
      competitors: geoMentionChecks.competitors,
      answer: geoMentionChecks.answer,
      excerpt: geoMentionChecks.excerpt,
      grounding: geoMentionChecks.grounding,
      sources: geoMentionChecks.sources,
      language: geoMentionChecks.language,
      capturedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(
      and(
        mentionFilters(scope, undefined, {
          sequences: "single",
          englishOnly: true,
        }),
        inArray(geoMentionChecks.promptId, query.promptIds),
        eq(geoMentionChecks.turn, 0)
      )
    )
    .orderBy(desc(geoMentionChecks.capturedAt))
    .limit(query.limit);

  return rows.map((row) => ({
    id: row.id,
    scanId: row.scanId,
    engine: row.engine,
    mentioned: row.mentioned,
    position: row.position,
    sentiment: row.sentiment,
    competitors: row.competitors,
    answer: row.answer,
    excerpt: row.excerpt,
    grounding: parseGeoCheckGrounding(row.grounding),
    sources: row.sources,
    language: row.language,
    capturedAt: row.capturedAt,
  }));
}

export async function queryGeoCheckCompetitorShare(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  limit: number,
  options?: GeoCheckFilterOptions
): Promise<GeoCheckCompetitorShareRow[]> {
  const withinParts = capturedWithin(window);
  const projectFilter = scope.projectId
    ? sql`and ${geoMentionChecks.projectId} = ${scope.projectId}`
    : sql``;
  const windowFilter =
    withinParts.length > 0 ? sql`and ${and(...withinParts)}` : sql``;
  const optionParts = mentionOptionFilters(options);
  const optionFilter =
    optionParts.length > 0 ? sql`and ${and(...optionParts)}` : sql``;

  const result = await db.execute<{ brand: string; mentions: number }>(sql`
    select brand, count(*)::int as mentions
    from ${geoMentionChecks}
    cross join lateral unnest(${geoMentionChecks.competitors}) as brand
    where ${geoMentionChecks.organizationId} = ${scope.organizationId}
      ${projectFilter}
      ${windowFilter}
      ${optionFilter}
    group by brand
    order by mentions desc
    limit ${limit}
  `);

  return (result.rows as { brand: string; mentions: number }[]).map((row) => ({
    brand: row.brand,
    mentions: toNumber(row.mentions),
  }));
}

export async function queryGeoCheckCompetitorShareTimeseries(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorShareTimeseriesRow[]> {
  const withinParts = capturedWithin(window);
  const projectFilter = scope.projectId
    ? sql`and ${geoMentionChecks.projectId} = ${scope.projectId}`
    : sql``;
  const windowFilter =
    withinParts.length > 0 ? sql`and ${and(...withinParts)}` : sql``;

  const result = await db.execute<{
    brand: string;
    day: string;
    mentions: number;
  }>(sql`
    select
      brand,
      (${geoMentionChecks.capturedAt})::date as day,
      count(*)::int as mentions
    from ${geoMentionChecks}
    cross join lateral unnest(${geoMentionChecks.competitors}) as brand
    where ${geoMentionChecks.organizationId} = ${scope.organizationId}
      ${projectFilter}
      ${windowFilter}
    group by brand, (${geoMentionChecks.capturedAt})::date
    order by day asc
  `);

  return (
    result.rows as { brand: string; day: string; mentions: number }[]
  ).map((row) => ({
    brand: row.brand,
    day: toDay(row.day),
    mentions: toNumber(row.mentions),
  }));
}

export async function queryGeoCheckCompetitorShareTrends(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  limit: number
): Promise<GeoCheckCompetitorShareTrendRow[]> {
  const withinParts = capturedWithin(window);
  const projectFilter = scope.projectId
    ? sql`and ${geoMentionChecks.projectId} = ${scope.projectId}`
    : sql``;
  const windowFilter =
    withinParts.length > 0 ? sql`and ${and(...withinParts)}` : sql``;

  const result = await db.execute<{
    day: string;
    brand: string;
    share: number;
  }>(sql`
    with daily_mentions as (
      select
        (${geoMentionChecks.capturedAt})::date as day,
        brand,
        count(*)::int as mentions
      from ${geoMentionChecks}
      cross join lateral unnest(${geoMentionChecks.competitors}) as brand
      where ${geoMentionChecks.organizationId} = ${scope.organizationId}
        ${projectFilter}
        ${windowFilter}
      group by day, brand
    ), brands as (
      select brand
      from daily_mentions
      group by brand
      order by sum(mentions) desc
      limit ${limit}
    ), selected_mentions as (
      select daily_mentions.*
      from daily_mentions
      inner join brands on brands.brand = daily_mentions.brand
    ), daily_totals as (
      select day, sum(mentions)::int as mentions
      from selected_mentions
      group by day
    )
    select
      daily_totals.day,
      brands.brand,
      round(coalesce(selected_mentions.mentions, 0)::numeric / nullif(daily_totals.mentions, 0), 3)::float8 as share
    from daily_totals
    cross join brands
    left join selected_mentions
      on selected_mentions.day = daily_totals.day
      and selected_mentions.brand = brands.brand
    order by daily_totals.day asc, brands.brand asc
  `);

  return (result.rows as { day: string; brand: string; share: number }[]).map(
    (row) => ({
      day: toDay(row.day),
      brand: row.brand,
      share: toNumber(row.share),
    })
  );
}

export async function queryGeoCheckCompetitorTimeseries(
  scope: GeoCheckScope,
  brand: string,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorTimeseriesRow[]> {
  const filters = [scopeWhere(scope), ...capturedWithin(window)];

  const rows = await db
    .select({
      day: sql<string>`(${geoMentionChecks.capturedAt})::date`,
      mentions: sql<number>`count(*) filter (where ${geoMentionChecks.competitors} @> array[${brand}]::text[])::int`,
      checks: sql<number>`count(*)::int`,
    })
    .from(geoMentionChecks)
    .where(and(...filters))
    .groupBy(sql`(${geoMentionChecks.capturedAt})::date`)
    .orderBy(sql`(${geoMentionChecks.capturedAt})::date asc`);

  return rows.map((row) => ({
    day: toDay(row.day),
    mentions: toNumber(row.mentions),
    checks: toNumber(row.checks),
  }));
}

export async function queryGeoCheckCompetitorPrompts(
  scope: GeoCheckScope,
  brand: string,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorPromptRow[]> {
  const filters = [
    scopeWhere(scope),
    sql`${geoMentionChecks.competitors} @> array[${brand}]::text[]`,
    ...capturedWithin(window),
  ];

  const rows = await db
    .selectDistinctOn([geoMentionChecks.promptId, geoMentionChecks.engine], {
      promptId: geoMentionChecks.promptId,
      engine: geoMentionChecks.engine,
      prompt: geoMentionChecks.prompt,
      mentioned: geoMentionChecks.mentioned,
      position: geoMentionChecks.position,
      capturedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(and(...filters))
    .orderBy(
      geoMentionChecks.promptId,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    );

  return rows
    .map((row) => ({
      promptId: row.promptId,
      engine: row.engine,
      prompt: row.prompt,
      mentioned: row.mentioned,
      position: row.position,
      capturedAt: row.capturedAt,
    }))
    .sort(
      (left, right) => right.capturedAt.getTime() - left.capturedAt.getTime()
    );
}

export async function queryGeoCheckLanguageShare(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckLanguageShareRow[]> {
  const filters = [scopeWhere(scope), ...capturedWithin(window)];

  const rows = await db
    .select({
      language: sql<string>`case when ${geoMentionChecks.language} = '' then 'English' else ${geoMentionChecks.language} end`,
      checks: sql<number>`count(*)::int`,
      mentions: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})::int`,
      mentionRate: sql<number>`round(count(*) filter (where ${geoMentionChecks.mentioned})::numeric / nullif(count(*), 0), 3)::float8`,
      avgPosition: sql<
        number | null
      >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
      lastCheckedAt: sql<Date>`max(${geoMentionChecks.capturedAt})`,
    })
    .from(geoMentionChecks)
    .where(and(...filters))
    .groupBy(
      sql`case when ${geoMentionChecks.language} = '' then 'English' else ${geoMentionChecks.language} end`
    )
    .orderBy(
      sql`count(*) filter (where ${geoMentionChecks.mentioned})::numeric / nullif(count(*), 0) desc`
    );

  return rows.map((row) => ({
    language: row.language,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    mentionRate: toNumber(row.mentionRate),
    avgPosition: toNullableNumber(row.avgPosition),
    lastCheckedAt: toDate(row.lastCheckedAt),
  }));
}

export async function queryGeoCheckLanguageShareTrends(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckLanguageShareTrendRow[]> {
  const filters = [scopeWhere(scope), ...capturedWithin(window)];
  const language = sql<string>`case when ${geoMentionChecks.language} = '' then 'English' else ${geoMentionChecks.language} end`;
  const day = sql<string>`(${geoMentionChecks.capturedAt})::date`;

  const rows = await db
    .select({
      day,
      language,
      mentionRate: sql<number>`round(count(*) filter (where ${geoMentionChecks.mentioned})::numeric / nullif(count(*), 0), 3)::float8`,
    })
    .from(geoMentionChecks)
    .where(and(...filters))
    .groupBy(day, language)
    .orderBy(day, language);

  return rows.map((row) => ({
    day: toDay(row.day),
    language: row.language,
    mentionRate: toNumber(row.mentionRate),
  }));
}

export async function queryGeoCheckSequenceResults(
  scope: GeoCheckScope,
  sequenceId: string | undefined
): Promise<GeoCheckSequenceResultRow[]> {
  const filters = [
    scopeWhere(scope),
    sql`${geoMentionChecks.sequenceId} is not null`,
  ];
  if (sequenceId) {
    filters.push(eq(geoMentionChecks.sequenceId, sequenceId));
  }

  const rows = await db
    .selectDistinctOn(
      [
        geoMentionChecks.sequenceId,
        geoMentionChecks.turn,
        geoMentionChecks.engine,
      ],
      {
        sequenceId: geoMentionChecks.sequenceId,
        turn: geoMentionChecks.turn,
        engine: geoMentionChecks.engine,
        prompt: geoMentionChecks.prompt,
        answer: geoMentionChecks.answer,
        mentioned: geoMentionChecks.mentioned,
        position: geoMentionChecks.position,
        sentiment: geoMentionChecks.sentiment,
        excerpt: geoMentionChecks.excerpt,
        sources: geoMentionChecks.sources,
        grounding: geoMentionChecks.grounding,
        finishReason: geoMentionChecks.finishReason,
        promptTokens: geoMentionChecks.promptTokens,
        outputTokens: geoMentionChecks.outputTokens,
        reasoningTokens: geoMentionChecks.reasoningTokens,
        lastCheckedAt: geoMentionChecks.capturedAt,
      }
    )
    .from(geoMentionChecks)
    .where(and(...filters))
    .orderBy(
      geoMentionChecks.sequenceId,
      geoMentionChecks.turn,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    );

  return rows.flatMap((row) => {
    if (!row.sequenceId) {
      return [];
    }
    return [
      {
        sequenceId: row.sequenceId,
        turn: row.turn,
        engine: row.engine,
        prompt: row.prompt,
        answer: row.answer,
        mentioned: row.mentioned,
        position: row.position,
        sentiment: row.sentiment,
        excerpt: row.excerpt,
        sources: row.sources,
        grounding: parseGeoCheckGrounding(row.grounding),
        finishReason: row.finishReason,
        promptTokens: row.promptTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        truncated:
          row.finishReason === null ? null : row.finishReason === "length",
        lastCheckedAt: row.lastCheckedAt,
      },
    ];
  });
}

const SCAN_COMPARISON_SCAN_COUNT = 2;

export async function queryGeoScanComparison(
  input: GeoCheckScanComparisonInput
): Promise<GeoCheckScanComparison> {
  // Daily recaps compare closing snapshots, not the last two intraday scans.
  // Keep the dashboard's unbounded, start-ordered comparison unchanged.
  const cutoffs = input.window
    ? [input.window.toExclusive, input.window.from]
    : [undefined];
  const scanGroups = await Promise.all(
    cutoffs.map((cutoff) =>
      db
        .select({
          id: geoScans.id,
          startedAt: geoScans.startedAt,
          finishedAt: geoScans.finishedAt,
        })
        .from(geoScans)
        .where(
          and(
            eq(geoScans.projectId, input.projectId),
            eq(geoScans.status, "completed"),
            cutoff ? lt(geoScans.finishedAt, cutoff) : undefined
          )
        )
        .orderBy(
          ...(cutoff
            ? [desc(geoScans.finishedAt), desc(geoScans.id)]
            : [desc(geoScans.startedAt)])
        )
        .limit(cutoff ? 1 : SCAN_COMPARISON_SCAN_COUNT)
    )
  );

  const currentScan = scanGroups[0]?.[0] ?? null;
  const previousScan =
    (input.window ? scanGroups[1]?.[0] : scanGroups[0]?.[1]) ?? null;
  if (!currentScan || !previousScan) {
    return { previousScan: null, currentScan, previous: [], current: [] };
  }

  const rows = await db
    .select({
      scanId: geoMentionChecks.scanId,
      engine: geoMentionChecks.engine,
      promptId: geoMentionChecks.promptId,
      prompt: geoMentionChecks.prompt,
      mentioned: geoMentionChecks.mentioned,
      position: geoMentionChecks.position,
      competitors: geoMentionChecks.competitors,
      grounding: geoMentionChecks.grounding,
      capturedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(
      and(
        eq(geoMentionChecks.projectId, input.projectId),
        inArray(geoMentionChecks.scanId, [currentScan.id, previousScan.id]),
        eq(geoMentionChecks.turn, 0),
        isNull(geoMentionChecks.sequenceId),
        inArray(geoMentionChecks.language, [...GEO_CHECK_ENGLISH_LANGUAGES])
      )
    );

  const previous: GeoCheckScanComparisonRow[] = [];
  const current: GeoCheckScanComparisonRow[] = [];
  for (const row of rows) {
    const mapped: GeoCheckScanComparisonRow = {
      scanId: row.scanId,
      engine: row.engine,
      promptId: row.promptId,
      prompt: row.prompt,
      mentioned: row.mentioned,
      position: row.position,
      competitors: row.competitors,
      grounding: parseGeoCheckGrounding(row.grounding),
      capturedAt: row.capturedAt,
    };
    if (row.scanId === currentScan.id) {
      current.push(mapped);
    }
    if (row.scanId === previousScan.id) {
      previous.push(mapped);
    }
  }

  return { previousScan, currentScan, previous, current };
}
