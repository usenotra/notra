import type { GscQueryRow } from "@notra/ai/types/google-search-console";

import {
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

export function selectKeywordsForModel(
  rows: GscQueryRow[],
  brandTerms: string[]
): GscQueryRow[] {
  return rows
    .filter(
      (row) =>
        row.impressions >= GSC_SYNC_MIN_IMPRESSIONS &&
        !promptMentionsBrand(row.query, brandTerms)
    )
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, GSC_SYNC_MAX_KEYWORDS_FOR_MODEL);
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
