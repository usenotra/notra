const SEPARATOR_PATTERN = /[\s\-_/@.]+/g;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}\p{M}]/u;
const LEAD_SURROGATE_MIN = 0xd800;
const LEAD_SURROGATE_MAX = 0xdbff;
const TRAIL_SURROGATE_MIN = 0xdc00;
const TRAIL_SURROGATE_MAX = 0xdfff;

/**
 * Collapses casing, whitespace and package-style punctuation so that
 * `@acme/email-sdk`, `email_sdk` and `Email SDK` share one form.
 */
function normalizeBrandText(text: string): string {
  return text.toLowerCase().replace(SEPARATOR_PATTERN, " ").trim();
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && WORD_CHARACTER_PATTERN.test(character);
}

function isLeadSurrogate(unit: number): boolean {
  return unit >= LEAD_SURROGATE_MIN && unit <= LEAD_SURROGATE_MAX;
}

function isTrailSurrogate(unit: number): boolean {
  return unit >= TRAIL_SURROGATE_MIN && unit <= TRAIL_SURROGATE_MAX;
}

function codePointStringAt(
  text: string,
  index: number
): string | undefined {
  if (index < 0 || index >= text.length) {
    return undefined;
  }
  const codePoint = text.codePointAt(index);
  if (codePoint === undefined) {
    return undefined;
  }
  return String.fromCodePoint(codePoint);
}

/**
 * Returns the code point that ends immediately before `index`. JavaScript
 * string indexes are UTF-16 units, so `text[index - 1]` can be a trail
 * surrogate rather than the preceding letter.
 */
function codePointStringBefore(
  text: string,
  index: number
): string | undefined {
  if (index <= 0 || index > text.length) {
    return undefined;
  }
  const trail = text.charCodeAt(index - 1);
  if (index >= 2 && isTrailSurrogate(trail)) {
    const lead = text.charCodeAt(index - 2);
    if (isLeadSurrogate(lead)) {
      return codePointStringAt(text, index - 2);
    }
  }
  return text[index - 1];
}

function containsTerm(haystack: string, term: string): boolean {
  let from = 0;
  while (from <= haystack.length - term.length) {
    const index = haystack.indexOf(term, from);
    if (index === -1) {
      return false;
    }
    const before = codePointStringBefore(haystack, index);
    const after = codePointStringAt(haystack, index + term.length);
    if (!isWordCharacter(before) && !isWordCharacter(after)) {
      return true;
    }
    from = index + 1;
  }
  return false;
}

/**
 * Returns the company name or alias that literally appears in the answer, or
 * null when none does. This is the source of truth for `mentioned`; the judge
 * model only supplies position, sentiment, competitors and excerpt.
 */
export function findBrandMention(
  answer: string,
  companyName: string,
  aliases: readonly string[]
): string | null {
  const haystack = normalizeBrandText(answer);
  if (haystack.length === 0) {
    return null;
  }
  for (const term of [companyName, ...aliases]) {
    const needle = normalizeBrandText(term);
    if (needle.length > 0 && containsTerm(haystack, needle)) {
      return term;
    }
  }
  return null;
}
