/** Deterministic checks for generated content. */

const DASH_REGEX = /[–—]/g;

/** Labels that name the format instead of the content. */
export const GENERIC_TITLES =
  /^(changelog|blog post|linkedin post|tweet|updates?|improvements?|weekly update)s?$/i;
// Whole month names or abbreviations only, so "Markdown", "Decision" or
// "Separate" are not mistaken for dates.
export const DATE_REGEX =
  /\b(20\d\d|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b|\bq[1-4]\b|\bweek \d+\b/i;

/**
 * A sentence talks about the writer's sources instead of the product when it
 * names a source and says what that source does or does not say, e.g. "The
 * release notes do not mention further steps".
 */
const SOURCE_NOUN_REGEX =
  /\b(?:commits?|pull requests?|PRs?|release notes|change ?logs?|source data|sources?|Quell(?:e|en|daten))\b|Änderungsinformationen/i;
const SOURCE_CLAIM_REGEX =
  /\b(?:mentions?|mentioned|specif(?:y|ies|ied)|states?|stated|describes?|described|lists?|listed|says?|genannt|erwähnt|angegeben|beschrieben|according to|based on|laut|gemäß)\b/i;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+|\n+/;

// Capitalized month names only, so "Changes you may notice" is not a date.
const TITLE_DATE_REGEX =
  /\b(?:20\d\d|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b[Ww]eek \d+\b|\bQ[1-4]\b/;

// A format label in front of the title, e.g. "Changelog: Weekly update".
const FORMAT_PREFIX_REGEX =
  /^(?:changelog|release notes|weekly update|updates?|news)\s*[:|-]?\s*/i;

/** Titles that name a date range or the format instead of what changed. */
export function titleProblem(title: string): string | undefined {
  const trimmed = title.trim();
  const rest = trimmed.replace(FORMAT_PREFIX_REGEX, "");
  if (GENERIC_TITLES.test(trimmed) || !rest || GENERIC_TITLES.test(rest)) {
    return "format label";
  }
  if (TITLE_DATE_REGEX.test(trimmed)) {
    return "date in title";
  }
  return undefined;
}

export function metaHits(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_REGEX)
    .filter(
      (sentence) =>
        SOURCE_NOUN_REGEX.test(sentence) && SOURCE_CLAIM_REGEX.test(sentence)
    )
    .map((sentence) => sentence.trim().slice(0, 120));
}
