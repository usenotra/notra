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
const AI_SEARCH_IES_PLURAL_REGEX = /(?<=\p{L}{2})ies?$/u;
const AI_SEARCH_CONSONANT_Y_REGEX = /(?<=\p{L}[^aeiou\d])y$/u;
const AI_SEARCH_SSES_PLURAL_REGEX = /(?<=\p{L}{2})sses$/u;
const AI_SEARCH_S_PLURAL_REGEX = /(?<=\p{L}{3}[^siu\d])s$/u;

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

export function aiSearchQueryKey(query: string): string {
  const tokens = query
    .normalize("NFC")
    .toLowerCase()
    .split(AI_SEARCH_TOKEN_SPLIT_REGEX)
    .filter(
      (token) => token.length > 0 && !GEO_AI_SEARCH_QUERY_STOPWORDS.has(token)
    );
  return [...new Set(tokens.map(singularizeQueryToken))].sort().join(" ");
}

function singularizeQueryToken(token: string): string {
  if (AI_SEARCH_IES_PLURAL_REGEX.test(token)) {
    return token.replace(AI_SEARCH_IES_PLURAL_REGEX, "i");
  }
  if (AI_SEARCH_CONSONANT_Y_REGEX.test(token)) {
    return token.replace(AI_SEARCH_CONSONANT_Y_REGEX, "i");
  }
  if (AI_SEARCH_SSES_PLURAL_REGEX.test(token)) {
    return token.replace(AI_SEARCH_SSES_PLURAL_REGEX, "ss");
  }
  return token.replace(AI_SEARCH_S_PLURAL_REGEX, "");
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
