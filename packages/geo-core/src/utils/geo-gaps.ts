import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";

import {
  GEO_AI_SEARCH_QUERY_STOPWORDS,
  GEO_GAPS_COMPETITOR_SIGNAL_CAP,
} from "../constants/geo";
import type { GeoGapBriefBaseline, GeoGapOpportunityInput } from "../types/geo";

export const REUSABLE_BRIEF_STATUSES = [
  "draft",
  "approved",
  "writing",
  "failed",
] as const satisfies readonly GeoContentBriefStatus[];

const AI_SEARCH_TOKEN_SPLIT_REGEX = /[^\p{L}\p{N}\p{M}]+/u;
const AI_SEARCH_YEAR_REGEX = /^(?:19|20)\d{2}$/;

const OPEN_BRIEF_STATUSES = new Set<GeoContentBriefStatus>(
  REUSABLE_BRIEF_STATUSES
);

export function isMissingMajority(
  missingCount: number,
  total: number
): boolean {
  return missingCount * 2 >= total;
}

export function gapOpportunityScore(input: GeoGapOpportunityInput): number {
  const visibilityDeficit = Math.max(0, Math.min(1, 1 - input.ownMentionRate));
  const competitorSignal =
    1 + Math.min(input.competitorCount, GEO_GAPS_COMPETITOR_SIGNAL_CAP);
  return visibilityDeficit * input.engineCoverage * competitorSignal;
}

export function searchGapClicks(
  keywords: Array<{ clicks: number }> | null | undefined
): number | null {
  if (!keywords || keywords.length === 0) {
    return null;
  }
  return keywords.reduce((sum, keyword) => sum + keyword.clicks, 0);
}

export function searchGapPosition(
  keywords: Array<{ position: number; impressions: number }> | null | undefined
): number | null {
  if (!keywords || keywords.length === 0) {
    return null;
  }
  const weight = keywords.reduce(
    (sum, keyword) => sum + keyword.impressions,
    0
  );
  if (weight <= 0) {
    const plain =
      keywords.reduce((sum, keyword) => sum + keyword.position, 0) /
      keywords.length;
    return Number(plain.toFixed(1));
  }
  const weighted =
    keywords.reduce(
      (sum, keyword) => sum + keyword.position * keyword.impressions,
      0
    ) / weight;
  return Number(weighted.toFixed(1));
}

export function isReusableBriefStatus(status: GeoContentBriefStatus): boolean {
  return OPEN_BRIEF_STATUSES.has(status);
}

export function searchGapImpressions(
  keywords: Array<{ impressions: number }> | null | undefined
): number | null {
  if (!keywords || keywords.length === 0) {
    return null;
  }
  return keywords.reduce((sum, keyword) => sum + keyword.impressions, 0);
}

export function toGapBriefBaseline(value: unknown): GeoGapBriefBaseline | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("mentionedEngines" in value && "totalEngines" in value)) {
    return null;
  }
  const { mentionedEngines, totalEngines } = value;
  if (
    typeof mentionedEngines !== "number" ||
    typeof totalEngines !== "number"
  ) {
    return null;
  }
  return { mentionedEngines, totalEngines };
}

function aiSearchQueryTokens(query: string): string[] {
  const tokens = query
    .normalize("NFC")
    .toLowerCase()
    .split(AI_SEARCH_TOKEN_SPLIT_REGEX)
    .filter(
      (token) => token.length > 0 && !GEO_AI_SEARCH_QUERY_STOPWORDS.has(token)
    );
  return [...new Set(tokens)].sort();
}

export function aiSearchGroupKey(query: string): string {
  return aiSearchQueryTokens(query)
    .filter((token) => !AI_SEARCH_YEAR_REGEX.test(token))
    .join(" ");
}

export function aiSearchGapId(
  groupKey: string,
  queries: Iterable<string>
): string {
  let latestYear = "";
  for (const query of queries) {
    for (const token of aiSearchQueryTokens(query)) {
      if (AI_SEARCH_YEAR_REGEX.test(token) && token > latestYear) {
        latestYear = token;
      }
    }
  }
  return latestYear ? `${groupKey} ${latestYear}` : groupKey;
}

export function interleaveSearchQueries(
  lists: readonly (readonly string[])[],
  limit: number
): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest && picked.length < limit; index += 1) {
    for (const list of lists) {
      const query = list[index]?.trim() ?? "";
      const key = query.toLowerCase();
      if (key.length === 0 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      picked.push(query);
      if (picked.length >= limit) {
        break;
      }
    }
  }
  return picked;
}
