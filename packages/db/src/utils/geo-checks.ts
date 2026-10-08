import {
  and,
  desc,
  eq,
  ne,
  gte,
  inArray,
  ilike,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { db } from "../drizzle";
import { geoMentionChecks, geoScans, geoSettings } from "../schema";
import type {
  GeoCheckCompetitorPromptRow,
  GeoCheckCompetitorPromptSummaryRow,
  GeoCheckCompetitorShareRow,
  GeoCheckOwnBrandShare,
  GeoCheckOwnBrandShareRow,
  GeoCheckCompetitorShareAggregateRow,
  GeoCheckCompetitorTimeseriesRow,
  GeoCheckBrandKey,
  GeoCheckEngineBrandRow,
  GeoCheckEngineTotalRow,
  GeoCheckFilterOptions,
  GeoCheckInsertSummary,
  GeoCheckLanguageShareRow,
  GeoCheckLanguageShareTrendRow,
  GeoCheckOverviewRow,
  GeoCheckPromptHistoryQuery,
  GeoCheckPromptHistoryRow,
  GeoCheckPromptResultRow,
  GeoCheckPromptSummaryRow,
  GeoCheckPromptSummaryQuery,
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
import type {
  GeoSentimentCursor,
  GeoSentimentRow,
} from "../types/geo-sentiment";
import {
  bumpGeoCheckGeneration,
  withGeoCheckAggregateCache,
} from "./geo-check-cache";
import { parseGeoCheckGrounding } from "./geo-grounding";

export async function queryGeoCheckSentiment(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoSentimentRow[]> {
  // captured_at is timestamp without time zone; writers persist UTC wall time.
  const day = sql<string>`to_char(${geoMentionChecks.capturedAt}, 'YYYY-MM-DD')`;
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        day,
        engine: geoMentionChecks.engine,
        totalChecks: sql<number>`count(*)::int`,
        mentions: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})::int`,
        positive: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.sentiment} = 'positive')::int`,
        neutral: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.sentiment} = 'neutral')::int`,
        negative: sql<number>`count(*) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.sentiment} = 'negative')::int`,
        lastCheckedAt: sql<string>`to_char(max(${geoMentionChecks.capturedAt}), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      })
      .from(geoMentionChecks)
      .where(
        and(
          mentionFilters(scope, window, PROMPT_LEVEL_FILTERS),
          eq(geoMentionChecks.turn, 0)
        )
      )
      .groupBy(day, geoMentionChecks.engine)
      .orderBy(day, geoMentionChecks.engine)
  );
  return rows;
}

export function queryGeoSentimentBrand(scope: GeoCheckScope) {
  return db.query.geoSettings.findFirst({
    columns: { companyName: true },
    where: and(
      eq(geoSettings.projectId, scope.projectId ?? ""),
      eq(geoSettings.organizationId, scope.organizationId)
    ),
  });
}

export async function queryGeoCheckSentimentEvidence(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  limit: number,
  cursor?: GeoSentimentCursor
) {
  return db
    .select({
      id: geoMentionChecks.id,
      scanId: geoMentionChecks.scanId,
      promptId: geoMentionChecks.promptId,
      prompt: geoMentionChecks.prompt,
      engine: geoMentionChecks.engine,
      language: geoMentionChecks.language,
      capturedAt: geoMentionChecks.capturedAt,
      answer: geoMentionChecks.answer,
      excerpt: geoMentionChecks.excerpt,
    })
    .from(geoMentionChecks)
    .where(
      and(
        mentionFilters(scope, window, PROMPT_LEVEL_FILTERS),
        eq(geoMentionChecks.mentioned, true),
        eq(geoMentionChecks.sentiment, "negative"),
        eq(geoMentionChecks.turn, 0),
        cursor
          ? eq(
              geoMentionChecks.projectId,
              cursor.projectId ?? scope.projectId ?? ""
            )
          : undefined,
        cursor
          ? or(
              lt(geoMentionChecks.capturedAt, new Date(cursor.capturedAt)),
              and(
                eq(geoMentionChecks.capturedAt, new Date(cursor.capturedAt)),
                lt(geoMentionChecks.id, cursor.id)
              )
            )
          : undefined
      )
    )
    .orderBy(desc(geoMentionChecks.capturedAt), desc(geoMentionChecks.id))
    .limit(limit);
}

export async function queryGeoSentimentAnalysisSnapshot(
  scope: GeoCheckScope,
  window: GeoCheckWindow
) {
  const [row] = await db
    .select({
      fingerprint: sql<string>`md5(coalesce(string_agg(md5(jsonb_build_array(${geoMentionChecks.id}, ${geoMentionChecks.answer}, ${geoMentionChecks.prompt}, ${geoMentionChecks.sentiment}, ${geoMentionChecks.engine}, ${geoMentionChecks.capturedAt})::text), '' order by ${geoMentionChecks.id}), ''))`,
      eligible: sql<number>`count(*)::int`,
      latestCapturedAt: sql<
        string | null
      >`to_char(max(${geoMentionChecks.capturedAt}), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
    })
    .from(geoMentionChecks)
    .where(
      and(
        mentionFilters(scope, window, PROMPT_LEVEL_FILTERS),
        eq(geoMentionChecks.turn, 0),
        eq(geoMentionChecks.mentioned, true),
        inArray(geoMentionChecks.sentiment, ["positive", "negative"])
      )
    );
  if (!row) {
    throw new Error("Sentiment snapshot returned no aggregate");
  }
  return row;
}

export async function queryGeoSentimentAnalysisSample(
  scope: GeoCheckScope,
  window: GeoCheckWindow,
  limitPerPolarity: number,
  answerChars: number
) {
  const groups = await Promise.all(
    ["positive", "negative"].map((sentiment) =>
      db
        .select({
          id: geoMentionChecks.id,
          sentiment: geoMentionChecks.sentiment,
          answer: sql<string>`left(${geoMentionChecks.answer}, ${answerChars})`,
          prompt: sql<string>`left(${geoMentionChecks.prompt}, 500)`,
          engine: geoMentionChecks.engine,
          capturedAt: sql<string>`to_char(${geoMentionChecks.capturedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
        })
        .from(geoMentionChecks)
        .where(
          and(
            mentionFilters(scope, window, PROMPT_LEVEL_FILTERS),
            eq(geoMentionChecks.turn, 0),
            eq(geoMentionChecks.mentioned, true),
            eq(geoMentionChecks.sentiment, sentiment)
          )
        )
        .orderBy(sql`md5(${geoMentionChecks.id})`, geoMentionChecks.id)
        .limit(limitPerPolarity)
    )
  );
  return groups.flat();
}

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
  // Anchored to the start of the UTC day, like the `from`/`to` branch: a
  // millisecond-precise `now` would make every request a distinct cache key.
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
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

/**
 * Persona conversations are stored as mention checks under synthetic prompt
 * IDs. Prompt-level views (results, history, per-prompt competitors) reason
 * about tracked prompts and keep them out; the engine, language and brand
 * aggregates count them like every other answer.
 */
const withoutPersonaRows = isNull(geoMentionChecks.personaId);
const unnestedCompetitorBrand = sql`unnest(${geoMentionChecks.competitors}) as brand`;
const competitorBrand = sql<string>`brand`;

/** Views that list or compare individual tracked prompts. */
const PROMPT_LEVEL_FILTERS: GeoCheckFilterOptions = {
  trackedPromptsOnly: true,
  promptLanguageOnly: true,
};

const normalizedLanguage = sql`case when ${geoMentionChecks.language} = '' then 'English' else ${geoMentionChecks.language} end`;

/**
 * Rows in the language the project's prompts are written in. The other tracked
 * languages are translations of the same prompts, so a per-prompt view would
 * otherwise show one prompt once per language.
 */
export const geoCheckInPromptLanguage = sql`${normalizedLanguage} = coalesce((select ${geoSettings.promptLanguage} from ${geoSettings} where ${geoSettings.projectId} = ${geoMentionChecks.projectId} limit 1), 'English')`;

/**
 * One checked prompt on one engine in one scan and language. Multi-turn
 * conversations and persona conversations store a row per turn; counting the
 * unit instead of the rows makes a conversation one check, however long.
 */
const checkUnit = sql`concat_ws(':', ${geoMentionChecks.scanId}, ${geoMentionChecks.promptId}, ${geoMentionChecks.sequenceId}, ${geoMentionChecks.engine}, ${geoMentionChecks.language})`;
const countChecks = sql<number>`count(distinct ${checkUnit})::int`;

/** Checks where at least one turn matches `condition`. */
function countChecksWhere(condition: SQL): SQL<number> {
  return sql<number>`count(distinct ${checkUnit}) filter (where ${condition})::int`;
}

function checkRateWhere(condition: SQL): SQL<number> {
  return sql<number>`round(count(distinct ${checkUnit}) filter (where ${condition})::numeric / nullif(count(distinct ${checkUnit}), 0), 3)::float8`;
}

const isMentioned = sql`${geoMentionChecks.mentioned}`;
const isCited = sql`${geoMentionChecks.ownedSourceCited}`;
const isVisible = sql`(${geoMentionChecks.mentioned} or ${geoMentionChecks.ownedSourceCited})`;

function mentionOptionFilters(options?: GeoCheckFilterOptions): SQL[] {
  const parts: SQL[] = [];
  if (options?.trackedPromptsOnly) {
    parts.push(withoutPersonaRows, isNull(geoMentionChecks.sequenceId));
  }
  if (options?.promptLanguageOnly) {
    parts.push(geoCheckInPromptLanguage);
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
  const summary = await insertGeoMentionChecksWithSummary(rows);
  return summary.checks;
}

export async function insertGeoMentionChecksWithSummary(
  rows: GeoCheckWrite[]
): Promise<GeoCheckInsertSummary> {
  if (rows.length === 0) {
    return { checks: 0, mentions: 0 };
  }

  let checks = 0;
  let mentions = 0;
  for (let index = 0; index < rows.length; index += CHECK_INSERT_CHUNK) {
    const chunk = rows.slice(index, index + CHECK_INSERT_CHUNK).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      organizationId: row.organizationId,
      projectId: row.projectId,
      scanId: row.scanId,
      engine: row.engine,
      promptId: row.promptId,
      sequenceId: row.sequenceId ?? null,
      personaId: row.personaId ?? null,
      personaSnapshot: row.personaSnapshot ?? null,
      turn: row.turn ?? 0,
      prompt: row.prompt,
      answer: row.answer,
      mentioned: row.mentioned,
      ownedSourceCited: row.ownedSourceCited,
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
      durationMs: row.durationMs ?? null,
      costUsd: row.costUsd ?? null,
      judgeTokens: row.judgeTokens ?? null,
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
      .returning({ mentioned: geoMentionChecks.mentioned });
    checks += inserted.length;
    mentions += inserted.filter((row) => row.mentioned).length;
  }
  // Bump even when every row already existed: a retried step whose first
  // attempt inserted the rows but died before this bump still has to make
  // the aggregates cached during the scan stale.
  await bumpGeoCheckGeneration(rows.map((row) => row.organizationId));
  return { checks, mentions };
}

export async function queryGeoCheckOverview(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckOverviewRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        engine: geoMentionChecks.engine,
        checks: countChecks,
        mentions: countChecksWhere(isMentioned),
        mentionRate: checkRateWhere(isMentioned),
        citations: countChecksWhere(isCited),
        visibility: countChecksWhere(isVisible),
        visibilityRate: checkRateWhere(isVisible),
        avgPosition: sql<
          number | null
        >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
        lastCheckedAt: sql<Date>`max(${geoMentionChecks.capturedAt})`,
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window))
      .groupBy(geoMentionChecks.engine)
      .orderBy(
        sql`count(distinct ${checkUnit}) filter (where ${isVisible})::numeric / nullif(count(distinct ${checkUnit}), 0) desc`
      )
  );

  return rows.map((row) => ({
    engine: row.engine,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    mentionRate: toNumber(row.mentionRate),
    citations: toNumber(row.citations),
    visibility: toNumber(row.visibility),
    visibilityRate: toNumber(row.visibilityRate),
    avgPosition: toNullableNumber(row.avgPosition),
    lastCheckedAt: toDate(row.lastCheckedAt),
  }));
}

export async function queryGeoCheckTimeseries(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  options?: GeoCheckFilterOptions
): Promise<GeoCheckTimeseriesRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        day: sql<string>`(${geoMentionChecks.capturedAt})::date`,
        engine: geoMentionChecks.engine,
        checks: countChecks,
        mentions: countChecksWhere(isMentioned),
        citations: countChecksWhere(isCited),
        visibility: countChecksWhere(isVisible),
        avgPosition: sql<
          number | null
        >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window, options))
      .groupBy(
        sql`(${geoMentionChecks.capturedAt})::date`,
        geoMentionChecks.engine
      )
      .orderBy(sql`(${geoMentionChecks.capturedAt})::date asc`)
  );

  return rows.map((row) => ({
    day: toDay(row.day),
    engine: row.engine,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    citations: toNumber(row.citations),
    visibility: toNumber(row.visibility),
    avgPosition: toNullableNumber(row.avgPosition),
  }));
}

const promptResultColumns = {
  promptId: geoMentionChecks.promptId,
  engine: geoMentionChecks.engine,
  prompt: geoMentionChecks.prompt,
  answer: geoMentionChecks.answer,
  mentioned: geoMentionChecks.mentioned,
  ownedSourceCited: geoMentionChecks.ownedSourceCited,
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
    .where(mentionFilters(scope, window, PROMPT_LEVEL_FILTERS))
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
  organizationId: string,
  projectId?: string
): Promise<GeoCheckPromptResultRow | null> {
  const [row] = await db
    .select(promptResultColumns)
    .from(geoMentionChecks)
    .where(
      and(
        eq(geoMentionChecks.id, checkId),
        eq(geoMentionChecks.organizationId, organizationId),
        projectId ? eq(geoMentionChecks.projectId, projectId) : undefined
      )
    )
    .limit(1);

  return row ? toPromptResultRow(row) : null;
}

export async function queryGeoCheckPromptSummaries(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  query?: GeoCheckPromptSummaryQuery
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
      ownedSourceCited: geoMentionChecks.ownedSourceCited,
      position: geoMentionChecks.position,
      sentiment: geoMentionChecks.sentiment,
      competitors: geoMentionChecks.competitors,
      lastCheckedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(mentionFilters(scope, window, PROMPT_LEVEL_FILTERS))
    .orderBy(
      geoMentionChecks.promptId,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    )
    .as("latest_geo_prompt_summaries");

  const rows = db
    .select()
    .from(latest)
    .where(
      and(
        query?.engine ? eq(latest.engine, query.engine) : undefined,
        query?.mentioned === undefined
          ? undefined
          : eq(latest.mentioned, query.mentioned),
        query?.query
          ? ilike(latest.prompt, `%${query.query.replace(/[\\%_]/g, "\\$&")}%`)
          : undefined
      )
    )
    .orderBy(desc(latest.lastCheckedAt), latest.promptId, latest.engine);
  return query
    ? await withGeoCheckAggregateCache(
        scope,
        rows.limit(query.limit + 1).offset(query.offset)
      )
    : await withGeoCheckAggregateCache(scope, rows);
}

export async function queryGeoCheckPromptHistory(
  scope: GeoCheckScope,
  query: GeoCheckPromptHistoryQuery
): Promise<GeoCheckPromptHistoryRow[]> {
  if (query.promptIds.length === 0) {
    return [];
  }

  // Mention state only: the answer, excerpt, grounding and sources of an older
  // check are loaded on demand through `queryGeoCheckById`.
  const rowsQuery = db
    .select({
      id: geoMentionChecks.id,
      scanId: geoMentionChecks.scanId,
      engine: geoMentionChecks.engine,
      mentioned: geoMentionChecks.mentioned,
      ownedSourceCited: geoMentionChecks.ownedSourceCited,
      position: geoMentionChecks.position,
      sentiment: geoMentionChecks.sentiment,
      competitors: geoMentionChecks.competitors,
      language: geoMentionChecks.language,
      capturedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(
      and(
        mentionFilters(scope, undefined, {
          trackedPromptsOnly: true,
          promptLanguageOnly: !query.scanId,
        }),
        inArray(geoMentionChecks.promptId, query.promptIds),
        query.scanId ? eq(geoMentionChecks.scanId, query.scanId) : undefined,
        eq(geoMentionChecks.turn, 0)
      )
    )
    .orderBy(desc(geoMentionChecks.capturedAt));
  return await (query.scanId ? rowsQuery : rowsQuery.limit(query.limit));
}

function normalizeBrandName(name: string): string {
  return name.trim().toLowerCase();
}

function summarizeOwnBrandShare(
  rows: GeoCheckOwnBrandShareRow[]
): GeoCheckOwnBrandShare {
  const names = new Set<string>();
  const byBrand = new Map<string, Map<string, number>>();
  for (const row of rows) {
    names.add(normalizeBrandName(row.brand));
    for (const alias of row.aliases ?? []) {
      names.add(normalizeBrandName(alias));
    }
    const byDay = byBrand.get(row.brand) ?? new Map<string, number>();
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.mentions);
    byBrand.set(row.brand, byDay);
  }
  return { names, byBrand };
}

function sumMentions(byDay: Map<string, number>): number {
  let total = 0;
  for (const mentions of byDay.values()) {
    total += mentions;
  }
  return total;
}

async function queryGeoCheckOwnBrandShare(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  options?: GeoCheckFilterOptions
): Promise<GeoCheckOwnBrandShare> {
  const day = sql<string>`(${geoMentionChecks.capturedAt})::date`;
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        brand: geoSettings.companyName,
        aliases: geoSettings.aliases,
        day,
        mentions: countChecks,
      })
      .from(geoMentionChecks)
      .innerJoin(
        geoSettings,
        eq(geoSettings.projectId, geoMentionChecks.projectId)
      )
      .where(
        and(
          mentionFilters(scope, window, options),
          eq(geoMentionChecks.mentioned, true),
          ne(geoSettings.companyName, "")
        )
      )
      .groupBy(geoSettings.companyName, geoSettings.aliases, day)
  );
  return summarizeOwnBrandShare(
    rows.map((row) => ({
      brand: row.brand,
      aliases: row.aliases,
      day: toDay(row.day),
      mentions: toNumber(row.mentions),
    }))
  );
}

export async function queryGeoCheckCompetitorShare(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  limit: number,
  options?: GeoCheckFilterOptions
): Promise<GeoCheckCompetitorShareRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        brand: competitorBrand,
        mentions: countChecks,
      })
      .from(geoMentionChecks)
      .crossJoinLateral(unnestedCompetitorBrand)
      .where(mentionFilters(scope, window, options))
      .groupBy(competitorBrand)
      .orderBy(sql`count(distinct ${checkUnit}) desc`)
      .limit(limit)
  );
  const own = await queryGeoCheckOwnBrandShare(scope, window, options);
  const competitorRows = rows
    .filter((row) => !own.names.has(normalizeBrandName(row.brand)))
    .map((row) => ({ brand: row.brand, mentions: toNumber(row.mentions) }));
  const ownShareRows = [...own.byBrand].map(([brand, byDay]) => ({
    brand,
    mentions: sumMentions(byDay),
  }));

  return [...competitorRows, ...ownShareRows]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, limit);
}

/**
 * Checks and own-brand mentions per engine, with the same filters as the
 * competitor share so both sides of the brand × engine matrix line up.
 */
export async function queryGeoCheckEngineTotals(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckEngineTotalRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        engine: geoMentionChecks.engine,
        checks: countChecks,
        mentions: countChecksWhere(isMentioned),
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window))
      .groupBy(geoMentionChecks.engine)
  );

  return rows.map((row) => ({
    engine: row.engine,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
  }));
}

/**
 * Answers per engine that mention each brand. `brands` maps brand keys
 * (trimmed, lowercased) onto the name to report, so synonyms fold onto one
 * brand and an answer naming two of them still counts once.
 */
export async function queryGeoCheckEngineBrandMentions(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  brands: readonly GeoCheckBrandKey[]
): Promise<GeoCheckEngineBrandRow[]> {
  if (brands.length === 0) {
    return [];
  }
  const brandName = sql<string>`brand_map.name`;
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        engine: geoMentionChecks.engine,
        brand: brandName,
        mentions: countChecks,
      })
      .from(geoMentionChecks)
      .crossJoinLateral(unnestedCompetitorBrand)
      .innerJoin(
        sql`unnest(${sql.param(brands.map((brand) => brand.key))}::text[], ${sql.param(brands.map((brand) => brand.name))}::text[]) as brand_map(key, name)`,
        sql`brand_map.key = lower(trim(${competitorBrand}))`
      )
      .where(mentionFilters(scope, window))
      .groupBy(geoMentionChecks.engine, brandName)
  );

  return rows.map((row) => ({
    engine: row.engine,
    brand: row.brand,
    mentions: toNumber(row.mentions),
  }));
}

/**
 * Mentions per brand key (trimmed, lowercased), counted only for the given
 * keys. Unlike the share ranking it has no top-N cut, so a tracked brand is
 * counted even when hundreds of untracked brands are mentioned more often.
 */
export async function queryGeoCheckBrandKeyMentions(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined,
  brandKeys: readonly string[]
): Promise<GeoCheckCompetitorShareRow[]> {
  if (brandKeys.length === 0) {
    return [];
  }
  const brandKey = sql<string>`lower(trim(brand))`;
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        brand: brandKey,
        mentions: countChecks,
      })
      .from(geoMentionChecks)
      .crossJoinLateral(unnestedCompetitorBrand)
      .where(
        and(
          mentionFilters(scope, window),
          sql`${brandKey} = any(${sql.param([...brandKeys])}::text[])`
        )
      )
      .groupBy(brandKey)
  );

  return rows.map((row) => ({
    brand: row.brand,
    mentions: toNumber(row.mentions),
  }));
}

export async function queryGeoCheckCompetitorShareAggregate(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorShareAggregateRow[]> {
  const day = sql<string | null>`(${geoMentionChecks.capturedAt})::date`;
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        brand: competitorBrand,
        day,
        mentions: countChecks,
      })
      .from(geoMentionChecks)
      .crossJoinLateral(unnestedCompetitorBrand)
      .where(mentionFilters(scope, window))
      .groupBy(
        sql`grouping sets ((${competitorBrand}, ${day}), (${competitorBrand}))`
      )
      .orderBy(day)
  );
  const own = await queryGeoCheckOwnBrandShare(scope, window);
  const competitorRows = rows
    .filter((row) => !own.names.has(normalizeBrandName(row.brand)))
    .map((row) => ({
      brand: row.brand,
      day: row.day === null ? null : toDay(row.day),
      mentions: toNumber(row.mentions),
    }));
  const ownShareRows = [...own.byBrand].flatMap(([brand, byDay]) => [
    ...[...byDay].map(([ownDay, mentions]) => ({
      brand,
      day: ownDay,
      mentions,
    })),
    { brand, day: null, mentions: sumMentions(byDay) },
  ]);

  return [...competitorRows, ...ownShareRows];
}

export async function queryGeoCheckCompetitorTimeseries(
  scope: GeoCheckScope,
  brand: string,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorTimeseriesRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        day: sql<string>`(${geoMentionChecks.capturedAt})::date`,
        mentions: countChecksWhere(
          sql`${geoMentionChecks.competitors} @> array[${brand}]::text[]`
        ),
        checks: countChecks,
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window))
      .groupBy(sql`(${geoMentionChecks.capturedAt})::date`)
      .orderBy(sql`(${geoMentionChecks.capturedAt})::date asc`)
  );

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
    withoutPersonaRows,
    sql`${geoMentionChecks.competitors} @> array[${brand}]::text[]`,
    ...capturedWithin(window),
  ];

  const rows = await withGeoCheckAggregateCache(
    scope,
    db
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
      )
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

export async function queryGeoCheckCompetitorPromptSummary(
  scope: GeoCheckScope,
  brand: string,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckCompetitorPromptSummaryRow> {
  const latest = db
    .selectDistinctOn([geoMentionChecks.promptId, geoMentionChecks.engine], {
      promptId: geoMentionChecks.promptId,
      engine: geoMentionChecks.engine,
      mentioned: geoMentionChecks.mentioned,
    })
    .from(geoMentionChecks)
    .where(
      and(
        scopeWhere(scope),
        withoutPersonaRows,
        sql`${geoMentionChecks.competitors} @> array[${brand}]::text[]`,
        ...capturedWithin(window)
      )
    )
    .orderBy(
      geoMentionChecks.promptId,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    )
    .as("latest_geo_competitor_prompts");

  const [row] = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        answers: sql<number>`count(*)::int`,
        prompts: sql<number>`count(distinct ${latest.promptId})::int`,
        engineIds: sql<
          string[]
        >`coalesce(array_agg(distinct ${latest.engine}), '{}')`,
        ownMentioned: sql<number>`count(*) filter (where ${latest.mentioned})::int`,
      })
      .from(latest)
  );

  return {
    answers: toNumber(row?.answers),
    prompts: toNumber(row?.prompts),
    engineIds: row?.engineIds ?? [],
    ownMentioned: toNumber(row?.ownMentioned),
  };
}

export async function queryGeoCheckLanguageShare(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckLanguageShareRow[]> {
  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        language: sql<string>`${normalizedLanguage}`,
        checks: countChecks,
        mentions: countChecksWhere(isMentioned),
        mentionRate: checkRateWhere(isMentioned),
        citations: countChecksWhere(isCited),
        visibility: countChecksWhere(isVisible),
        visibilityRate: checkRateWhere(isVisible),
        avgPosition: sql<
          number | null
        >`round(avg(${geoMentionChecks.position}) filter (where ${geoMentionChecks.mentioned} and ${geoMentionChecks.position} is not null), 1)::float8`,
        lastCheckedAt: sql<Date>`max(${geoMentionChecks.capturedAt})`,
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window))
      .groupBy(normalizedLanguage)
      .orderBy(
        sql`count(distinct ${checkUnit}) filter (where ${isVisible})::numeric / nullif(count(distinct ${checkUnit}), 0) desc`
      )
  );

  return rows.map((row) => ({
    language: row.language,
    checks: toNumber(row.checks),
    mentions: toNumber(row.mentions),
    mentionRate: toNumber(row.mentionRate),
    citations: toNumber(row.citations),
    visibility: toNumber(row.visibility),
    visibilityRate: toNumber(row.visibilityRate),
    avgPosition: toNullableNumber(row.avgPosition),
    lastCheckedAt: toDate(row.lastCheckedAt),
  }));
}

export async function queryGeoCheckLanguageShareTrends(
  scope: GeoCheckScope,
  window: GeoCheckWindow | undefined
): Promise<GeoCheckLanguageShareTrendRow[]> {
  const language = sql<string>`${normalizedLanguage}`;
  const day = sql<string>`(${geoMentionChecks.capturedAt})::date`;

  const rows = await withGeoCheckAggregateCache(
    scope,
    db
      .select({
        day,
        language,
        mentionRate: checkRateWhere(isMentioned),
        visibilityRate: checkRateWhere(isVisible),
      })
      .from(geoMentionChecks)
      .where(mentionFilters(scope, window))
      .groupBy(day, language)
      .orderBy(day, language)
  );

  return rows.map((row) => ({
    day: toDay(row.day),
    language: row.language,
    mentionRate: toNumber(row.mentionRate),
    visibilityRate: toNumber(row.visibilityRate),
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
        ownedSourceCited: geoMentionChecks.ownedSourceCited,
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
        ownedSourceCited: row.ownedSourceCited,
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
      ownedSourceCited: geoMentionChecks.ownedSourceCited,
      position: geoMentionChecks.position,
      competitors: geoMentionChecks.competitors,
      // The diff only reads source domains. Search queries and titles make up
      // most of the column, so only url + domain of each source leave Postgres
      // (url is still needed: the parser drops sources without a valid URL).
      grounding: sql<unknown>`jsonb_build_object('sources', (
        select coalesce(
          jsonb_agg(jsonb_build_object('url', source->'url', 'domain', source->'domain')),
          '[]'::jsonb
        )
        from jsonb_array_elements(
          case
            when jsonb_typeof(${geoMentionChecks.grounding}->'sources') = 'array'
            then ${geoMentionChecks.grounding}->'sources'
            else '[]'::jsonb
          end
        ) as source
      ))`,
      capturedAt: geoMentionChecks.capturedAt,
    })
    .from(geoMentionChecks)
    .where(
      and(
        eq(geoMentionChecks.projectId, input.projectId),
        inArray(geoMentionChecks.scanId, [currentScan.id, previousScan.id]),
        eq(geoMentionChecks.turn, 0),
        isNull(geoMentionChecks.sequenceId),
        isNull(geoMentionChecks.personaId),
        geoCheckInPromptLanguage
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
      ownedSourceCited: row.ownedSourceCited,
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
