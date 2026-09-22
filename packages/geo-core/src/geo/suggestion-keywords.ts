import type { GscQueryRow } from "@notra/ai/types/google-search-console";

import {
  GSC_QUERY_CLUSTER_CAP,
  GSC_QUERY_CLUSTER_WORDS,
  GSC_SYNC_MAX_KEYWORDS_FOR_MODEL,
  GSC_SYNC_MIN_IMPRESSIONS,
} from "../constants/google-search-console";
import type { GeoSuggestionKeyword } from "../types/geo";

const MIN_BRAND_TERM_LENGTH = 3;
const REGEXP_ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
const BRAND_TOKEN_SEPARATOR = "[-_\\s]+";
/*
 * `\b` counts only [A-Za-z0-9_] as word characters, so a brand that starts or
 * ends on a non-ASCII letter never gets a boundary there and survives the
 * strip — "Nestlé" and "ブランド" did, while "Müller" happened to work because
 * its umlaut sits between two ASCII letters. Same class the answer mention
 * matcher uses; marks are included so a stray combining mark cannot split a
 * letter from its accent.
 */
const BRAND_WORD_CHAR = "[\\p{L}\\p{N}\\p{M}_]";
/*
 * ponytail: token list, not an intent model. A real buyer query that merely
 * contains one of these words is dropped. Loosen it if sync reviews show that.
 */
const NAVIGATIONAL_QUERY =
  /\b(?:log(?:in|\s+in|-in)|sign(?:\s+|-)?(?:in|up)|anmelden|einloggen|changelog|release notes|änderungsprotokoll|status page|statusseite|careers|karriere|stellenangebote|privacy policy|datenschutz|terms of service|impressum)\b/iu;
const WINNING_POSITION = 3;
const STRIKING_POSITION = 20;
const WEAK_POSITION = 40;
const WINNING_WEIGHT = 0.15;
const STRIKING_WEIGHT = 1;
const WEAK_WEIGHT = 0.6;
const DISTANT_WEIGHT = 0.25;
/** CTR above this counts as satisfied demand and stops lowering the score. */
const CTR_SATURATION = 0.5;

function escapeRegExp(value: string): string {
  return value.replace(REGEXP_ESCAPE_REGEX, "\\$&");
}

export function normalizeSuggestionKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeForBrandMatch(value: string): string {
  // NFC so an accent written as a combining mark folds back into its letter;
  // the punctuation pass below would otherwise strip the bare mark and make
  // decomposed "Nestlé" stop matching the composed alias.
  return normalizeSuggestionKey(value.normalize("NFC"))
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function promptMentionsBrand(
  text: string,
  brandTerms: string[]
): boolean {
  const normalized = ` ${normalizeForBrandMatch(text)} `;
  // Space-delimited so a short alias like "hub" does not drop "github".
  return brandTerms.some((term) =>
    normalized.includes(` ${normalizeForBrandMatch(term)} `)
  );
}

export function stripBrandTerms(text: string, brandTerms: string[]): string {
  let result = text.normalize("NFC");
  const sorted = [...brandTerms].sort(
    (left, right) => right.length - left.length
  );
  for (const term of sorted) {
    const folded = normalizeForBrandMatch(term);
    if (folded.length === 0) {
      continue;
    }
    const parts = folded.split(" ").filter(Boolean).map(escapeRegExp);
    if (parts.length === 0) {
      continue;
    }
    result = result.replace(
      new RegExp(
        `(?<!${BRAND_WORD_CHAR})${parts.join(BRAND_TOKEN_SEPARATOR)}(?!${BRAND_WORD_CHAR})`,
        "giu"
      ),
      " "
    );
  }
  return result.replace(/\s+/g, " ").trim();
}

export function buildBrandTerms(
  settings: { companyName: string; aliases: string[] } | null | undefined
): string[] {
  if (!settings) {
    return [];
  }
  return [settings.companyName, ...settings.aliases].flatMap((value) => {
    const term = normalizeSuggestionKey(value);
    return term.length >= MIN_BRAND_TERM_LENGTH ? [term] : [];
  });
}

function opportunityScore(row: GscQueryRow): number {
  const ctr =
    row.impressions > 0
      ? Math.min(row.clicks / row.impressions, CTR_SATURATION)
      : 0;
  let weight = DISTANT_WEIGHT;
  if (row.position <= WINNING_POSITION) {
    weight = WINNING_WEIGHT;
  } else if (row.position <= STRIKING_POSITION) {
    weight = STRIKING_WEIGHT;
  } else if (row.position <= WEAK_POSITION) {
    weight = WEAK_WEIGHT;
  }
  return row.impressions * weight * (1 - ctr);
}

function clusterKey(query: string): string {
  return normalizeSuggestionKey(query)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, GSC_QUERY_CLUSTER_WORDS)
    .join(" ");
}

/**
 * Ranks queries the site shows up for but does not win. Google's own response
 * is click-sorted, so a page already at position 1 would otherwise fill the
 * prompt budget and the actual gaps never reach the model.
 */
export function selectKeywordsForModel(
  rows: GscQueryRow[],
  brandTerms: string[]
): GscQueryRow[] {
  const ranked = rows
    .filter(
      (row) =>
        row.impressions >= GSC_SYNC_MIN_IMPRESSIONS &&
        !promptMentionsBrand(row.query, brandTerms) &&
        !NAVIGATIONAL_QUERY.test(row.query)
    )
    .sort(
      (left, right) =>
        opportunityScore(right) - opportunityScore(left) ||
        right.impressions - left.impressions
    );

  const picked: GscQueryRow[] = [];
  const perCluster = new Map<string, number>();
  for (const row of ranked) {
    if (picked.length >= GSC_SYNC_MAX_KEYWORDS_FOR_MODEL) {
      break;
    }
    const key = clusterKey(row.query);
    const count = perCluster.get(key) ?? 0;
    if (count >= GSC_QUERY_CLUSTER_CAP) {
      continue;
    }
    perCluster.set(key, count + 1);
    picked.push(row);
  }
  return picked;
}

/**
 * `used` is shared across all entries of one sync so a source query backs at
 * most one suggestion. Otherwise the model spreads one keyword cluster over
 * several near-identical prompts and their impressions get counted repeatedly.
 */
export function resolveSourceKeywords(
  claimed: string[],
  keywordByQuery: Map<string, GscQueryRow>,
  used: Set<string>
): GeoSuggestionKeyword[] {
  const sourceKeywords: GeoSuggestionKeyword[] = [];
  for (const keyword of claimed) {
    const key = normalizeSuggestionKey(keyword);
    const match = keywordByQuery.get(key);
    if (match && !used.has(key)) {
      used.add(key);
      sourceKeywords.push({
        query: match.query,
        clicks: match.clicks,
        impressions: match.impressions,
        position: Number(match.position.toFixed(1)),
      });
    }
  }
  return sourceKeywords;
}
