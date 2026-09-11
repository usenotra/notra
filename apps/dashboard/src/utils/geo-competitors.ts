import {
  GEO_FAMILY_BRANDS_LIMIT,
  GEO_FAMILY_OWN_BRAND_FALLBACK,
  OWN_BRAND_ROW_ID,
} from "@notra/geo-core/constants/geo";
import { competitorKey } from "@notra/geo-core/geo/domain";
import type {
  GeoCompetitor,
  GeoCompetitorKind,
  GeoCompetitorPromptRow,
  GeoCompetitorPromptSummary,
  GeoCompetitorSharePoint,
  GeoCompetitorShareTimeseriesPoint,
  GeoCompetitorTypeFilter,
  GeoPromptResultSummary,
  GeoSparklinePoint,
  ShareOfVoiceRow,
} from "@notra/geo-core/types/geo";
import { competitorCanonicalMap } from "@notra/geo-core/utils/geo-competitor-names";
import { engineFamilyOf } from "@notra/geo-core/utils/geo-engine-family";
import { sumGeoSparklinePoints } from "@notra/geo-core/utils/geo-sparkline";

import {
  CHART_MUTED_COLOR,
  CHART_PRIMARY_COLOR,
  RIVAL_SWATCHES,
} from "@/constants/charts";
import type { ChartColorPair } from "@/types/charts";
import type { EngineFamilyBrandRow, EngineFamilyBrandScope } from "@/types/geo";
import type { GeoCompetitorRowEntry } from "@/types/geo-competitors";

import { bestFuzzyScore, fuzzyMatches } from "./fuzzy";

const DOMAIN_LIKE_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const URL_PROTOCOL_PREFIX_REGEX = /^https?:\/\//;
const WWW_PREFIX_REGEX = /^www\./;
const TRAILING_SLASH_REGEX = /\/+$/;

export function formatCompetitorKind(kind: GeoCompetitorKind): string {
  return kind === "direct" ? "Direct" : "Indirect";
}

export function findOwnBrandDomain(aliases: readonly string[]): string | null {
  for (const alias of aliases) {
    const candidate = alias.trim().toLowerCase();
    if (DOMAIN_LIKE_REGEX.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

const FALLBACK_SLICE_COLOR = CHART_PRIMARY_COLOR.light;

export function isOwnBrandName(
  name: string,
  companyName?: string | null,
  aliases: readonly string[] = []
): boolean {
  if (!companyName) {
    return false;
  }
  const key = competitorKey(name);
  return key.length > 0 && ownBrandKeys(companyName, aliases).has(key);
}

export function competitorSliceColor(index: number): ChartColorPair {
  const hex =
    RIVAL_SWATCHES[index % RIVAL_SWATCHES.length] ?? FALLBACK_SLICE_COLOR;
  return { light: hex, dark: hex };
}

export function shareOfVoiceSliceColor(
  row: Pick<ShareOfVoiceRow, "brand" | "kind">,
  index: number,
  competitors?: readonly GeoCompetitor[],
  ownBrand?: { companyName?: string | null; aliases?: readonly string[] }
): ChartColorPair {
  if (row.kind === "aggregate") {
    return CHART_MUTED_COLOR;
  }
  const { brand } = row;
  if (isOwnBrandName(brand, ownBrand?.companyName, ownBrand?.aliases)) {
    return CHART_PRIMARY_COLOR;
  }
  const key = competitorKey(brand);
  const stored = competitors?.find(
    (competitor) => competitorKey(competitor.name) === key
  )?.color;
  if (stored) {
    return { light: stored, dark: stored };
  }
  return competitorSliceColor(index);
}

export function isTrackedShareOfVoiceBrand(
  brand: string,
  competitors: readonly GeoCompetitor[] | undefined,
  ownBrand?: { companyName?: string | null; aliases?: readonly string[] }
): boolean {
  if (isOwnBrandName(brand, ownBrand?.companyName, ownBrand?.aliases)) {
    return true;
  }
  const key = competitorKey(brand);
  return key.length > 0 && competitorCanonicalMap(competitors ?? []).has(key);
}

export function competitorPromptSummary(
  rows: readonly GeoCompetitorPromptRow[]
): GeoCompetitorPromptSummary {
  const engines = new Set<string>();
  let mentioned = 0;
  let bestPosition: number | null = null;
  for (const row of rows) {
    engines.add(row.engine);
    if (!row.mentioned) {
      continue;
    }
    mentioned += 1;
    if (
      row.position !== null &&
      (bestPosition === null || row.position < bestPosition)
    ) {
      bestPosition = row.position;
    }
  }
  return { mentioned, total: rows.length, bestPosition, engines: engines.size };
}

/**
 * Ranks every brand an engine family named across its latest prompts.
 * Share is "prompts naming the brand / prompts scanned", aggregating model and
 * mode variants so the ranking matches the prompt rows shown in the sheet.
 * The own brand always stays in the list.
 */
export function engineFamilyBrandRows(
  family: string,
  results: readonly GeoPromptResultSummary[],
  scope: EngineFamilyBrandScope = {},
  limit = GEO_FAMILY_BRANDS_LIMIT
): EngineFamilyBrandRow[] {
  const scoped = results.filter(
    (result) => engineFamilyOf(result.engine) === family
  );
  if (scoped.length === 0) {
    return [];
  }

  const canonical = competitorCanonicalMap(scope.competitors ?? []);
  const promptIds = new Set<string>();
  const ownMentionedPrompts = new Set<string>();
  const rivals = new Map<string, { name: string; promptIds: Set<string> }>();
  for (const result of scoped) {
    promptIds.add(result.promptId);
    if (result.mentioned) {
      ownMentionedPrompts.add(result.promptId);
    }
    for (const name of result.competitors) {
      const rawKey = competitorKey(name);
      if (rawKey.length === 0) {
        continue;
      }
      if (isOwnBrandName(name, scope.companyName, scope.aliases)) {
        continue;
      }
      const label = canonical.get(rawKey) ?? name;
      const key = competitorKey(label);
      const entry = rivals.get(key) ?? { name: label, promptIds: new Set() };
      entry.promptIds.add(result.promptId);
      rivals.set(key, entry);
    }
  }

  const toRow = (
    key: string,
    name: string,
    mentions: number,
    own: boolean
  ): EngineFamilyBrandRow => ({
    key,
    name,
    mentions,
    share: mentions / promptIds.size,
    own,
  });
  const ownRow = toRow(
    OWN_BRAND_ROW_ID,
    scope.companyName?.trim() || GEO_FAMILY_OWN_BRAND_FALLBACK,
    ownMentionedPrompts.size,
    true
  );
  const rows = [
    ownRow,
    ...[...rivals.entries()].map(([key, entry]) =>
      toRow(key, entry.name, entry.promptIds.size, false)
    ),
  ].sort((left, right) => {
    if (left.mentions !== right.mentions) {
      return right.mentions - left.mentions;
    }
    if (left.own !== right.own) {
      return left.own ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  if (rows.length <= limit) {
    return rows;
  }
  const top = rows.slice(0, limit);
  if (top.some((row) => row.own)) {
    return top;
  }
  return [...rows.slice(0, limit - 1), ownRow];
}

export function shareOfVoiceRivalIndex(
  rows: readonly Pick<ShareOfVoiceRow, "brand" | "kind">[],
  brand: string,
  ownBrand?: { companyName?: string | null; aliases?: readonly string[] }
): number {
  let index = 0;
  for (const row of rows) {
    if (row.kind === "aggregate") {
      continue;
    }
    if (row.brand === brand) {
      return index;
    }
    if (!isOwnBrandName(row.brand, ownBrand?.companyName, ownBrand?.aliases)) {
      index += 1;
    }
  }
  return index;
}

function ownBrandKeys(
  companyName: string,
  aliases: readonly string[]
): Set<string> {
  const keys = new Set<string>();
  for (const value of [companyName, ...aliases]) {
    const key = competitorKey(value);
    if (key.length > 0) {
      keys.add(key);
    }
  }
  return keys;
}

function isRivalSharePoint(
  point: GeoCompetitorSharePoint,
  ownKeys: ReadonlySet<string>
): boolean {
  const key = competitorKey(point.brand);
  return key.length > 0 && !ownKeys.has(key);
}

export function topRivalSharePoint(
  points: readonly GeoCompetitorSharePoint[],
  companyName: string,
  aliases: readonly string[] = []
): GeoCompetitorSharePoint | null {
  const ownKeys = ownBrandKeys(companyName, aliases);
  let leader: GeoCompetitorSharePoint | null = null;
  for (const point of points) {
    if (!isRivalSharePoint(point, ownKeys)) {
      continue;
    }
    if (!leader || point.mentions > leader.mentions) {
      leader = point;
    }
  }
  return leader;
}

export function rivalMentionShare(
  rival: GeoCompetitorSharePoint,
  points: readonly GeoCompetitorSharePoint[],
  companyName: string,
  aliases: readonly string[] = []
): number {
  const ownKeys = ownBrandKeys(companyName, aliases);
  let total = 0;
  for (const point of points) {
    if (isRivalSharePoint(point, ownKeys)) {
      total += point.mentions;
    }
  }
  if (total <= 0) {
    return 0;
  }
  return rival.mentions / total;
}

/** Keep mention-check names that match a tracked competitor or synonym. */
export function matchTrackedCompetitorNames(
  mentioned: readonly string[],
  competitors: readonly {
    name: string;
    synonyms?: readonly string[];
  }[]
): string[] {
  const aliases = competitorCanonicalMap(competitors);
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const name of mentioned) {
    const canonical = aliases.get(competitorKey(name));
    if (!canonical || seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    matched.push(canonical);
  }
  return matched;
}

export function mergeCompetitorSharePoints(
  points: readonly GeoCompetitorSharePoint[],
  competitors: readonly GeoCompetitor[] | undefined
): GeoCompetitorSharePoint[] {
  const canonicalByKey = competitorCanonicalMap(competitors ?? []);

  const merged = new Map<string, GeoCompetitorSharePoint>();
  for (const point of points) {
    const rawKey = competitorKey(point.brand);
    const brand = canonicalByKey.get(rawKey) ?? point.brand;
    const key = competitorKey(brand);
    const existing = merged.get(key);
    merged.set(key, {
      brand: canonicalByKey.get(key) ?? existing?.brand ?? point.brand,
      mentions: (existing?.mentions ?? 0) + point.mentions,
      trend: sumGeoSparklinePoints([existing?.trend ?? [], point.trend ?? []]),
    });
  }

  return [...merged.values()].sort((a, b) => b.mentions - a.mentions);
}

export function buildShareOfVoiceMentionSparklines(
  timeseries: readonly GeoCompetitorShareTimeseriesPoint[],
  rows: readonly ShareOfVoiceRow[],
  competitors: readonly GeoCompetitor[] | undefined
): Map<string, GeoSparklinePoint[]> {
  const canonicalByKey = competitorCanonicalMap(competitors ?? []);
  const byBrandDay = new Map<string, Map<string, number>>();

  for (const point of timeseries) {
    const rawKey = competitorKey(point.brand);
    const brand = canonicalByKey.get(rawKey) ?? point.brand;
    const key = competitorKey(brand);
    const dayMap = byBrandDay.get(key) ?? new Map<string, number>();
    dayMap.set(point.day, (dayMap.get(point.day) ?? 0) + point.mentions);
    byBrandDay.set(key, dayMap);
  }

  const allDays = [...new Set(timeseries.map((point) => point.day))].sort();
  const topBrandKeys = new Set<string>();
  for (const row of rows) {
    if (row.kind === "brand") {
      topBrandKeys.add(competitorKey(row.brand));
    }
  }

  const sparklines = new Map<string, GeoSparklinePoint[]>();

  for (const row of rows) {
    if (row.kind === "aggregate") {
      sparklines.set(
        row.id,
        allDays.map((day) => {
          let mentions = 0;
          for (const [brandKey, dayMap] of byBrandDay) {
            if (!topBrandKeys.has(brandKey)) {
              mentions += dayMap.get(day) ?? 0;
            }
          }
          return { day, value: mentions };
        })
      );
      continue;
    }

    const dayMap = byBrandDay.get(competitorKey(row.brand));
    sparklines.set(
      row.id,
      allDays.map((day) => ({
        day,
        value: dayMap?.get(day) ?? 0,
      }))
    );
  }

  return sparklines;
}

export function geoCompetitorDetailPath(
  organizationSlug: string,
  brand: string
): string {
  return `/${organizationSlug}/geo/competitors/${encodeURIComponent(brand)}`;
}

function normalizeDomainAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(URL_PROTOCOL_PREFIX_REGEX, "")
    .replace(WWW_PREFIX_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");
}

function ownBrandSynonyms(
  aliases: readonly string[],
  ownDomain: string | null
): string[] {
  const ownDomainKey = ownDomain ? normalizeDomainAlias(ownDomain) : null;
  return aliases.filter((alias) => {
    const key = normalizeDomainAlias(alias);
    return key.length > 0 && key !== ownDomainKey;
  });
}

export function buildCompetitorRows(
  competitors: readonly GeoCompetitor[],
  companyName: string,
  aliases: readonly string[],
  ownDomain: string | null,
  search: string,
  typeFilter: GeoCompetitorTypeFilter
): GeoCompetitorRowEntry[] {
  const query = search.trim().toLowerCase();
  const rows: GeoCompetitorRowEntry[] = [
    {
      id: OWN_BRAND_ROW_ID,
      name: companyName,
      domain: ownDomain,
      synonyms: ownBrandSynonyms(aliases, ownDomain),
      kind: "direct",
      isOwnBrand: true,
      color: CHART_PRIMARY_COLOR,
    },
  ];

  competitors.forEach((competitor, index) => {
    rows.push({
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
      synonyms: competitor.synonyms,
      kind: competitor.kind,
      isOwnBrand: false,
      color: competitor.color
        ? { light: competitor.color, dark: competitor.color }
        : competitorSliceColor(index),
    });
  });

  const filtered = rows.filter((row) => {
    if (typeFilter !== "all" && !row.isOwnBrand && row.kind !== typeFilter) {
      return false;
    }
    return fuzzyMatches([row.name, row.domain ?? "", ...row.synonyms], query);
  });

  if (query.length === 0) {
    return filtered;
  }

  return filtered
    .map((row) => ({
      row,
      score: bestFuzzyScore(
        [row.name, row.domain ?? "", ...row.synonyms],
        query
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.row);
}
