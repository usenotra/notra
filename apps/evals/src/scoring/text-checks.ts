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

/** Phrases the unslop skill tells writers to remove (subset that is easy to match). */
const SLOP_PATTERNS: readonly RegExp[] = [
  /\bdelv(e|es|ing)\b/i,
  /\bseamless(ly)?\b/i,
  /\bleverag(e|es|ing)\b/i,
  /\brobust\b/i,
  /\bgame[- ]chang(er|ing)\b/i,
  /\bunlock(s|ing)?\b/i,
  /\belevat(e|es|ing)\b/i,
  /\bempower(s|ing)?\b/i,
  /\bsupercharg(e|es|ing)\b/i,
  /\brevolutioni[sz](e|es|ing)\b/i,
  /\bcutting[- ]edge\b/i,
  /\bin today'?s (fast[- ]paced|digital|ever[- ]changing)\b/i,
  /\b(we'?re|we are) (thrilled|excited|delighted) to\b/i,
  /\bnot (just|only) [^.]{1,60}, but\b/i,
  /\bit'?s not [^.]{1,40}, it'?s\b/i,
  /\btake (it|things) to the next level\b/i,
  /\btapestry\b/i,
  /\btestament to\b/i,
  /\bboast(s|ing)?\b/i,
  /\bstreamlin(e|es|ed|ing)\b/i,
  /\bharness(es|ing)? the power\b/i,
  /\bnavigat(e|ing) the (complexities|landscape)\b/i,
];

export function countDashes(text: string): number {
  return text.match(DASH_REGEX)?.length ?? 0;
}

export function slopHits(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of SLOP_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      hits.push(match[0]);
    }
  }
  return hits;
}

const GERMAN_MARKERS =
  /\b(und|der|die|das|nicht|mit|für|ist|wir|ihr|du|dein|euch|jetzt|auch|wird|werden|bei|auf|eine?n?)\b/gi;
const ENGLISH_MARKERS =
  /\b(and|the|with|for|is|we|you|your|now|also|will|this|that|are|our)\b/gi;

/** Share of German function words among German + English ones. */
export function germanShare(text: string): number {
  const german = text.match(GERMAN_MARKERS)?.length ?? 0;
  const english = text.match(ENGLISH_MARKERS)?.length ?? 0;
  return german + english === 0 ? 0 : german / (german + english);
}

export function plainLength(markdown: string): number {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .trim().length;
}
