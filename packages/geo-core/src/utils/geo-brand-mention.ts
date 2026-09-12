const SEPARATOR_PATTERN = /[\s\-_/@.]+/g;
const WORD_CHARACTER_PATTERN = /^[\p{L}\p{M}\p{N}]$/u;
/** Scripts written without spaces between words; a Latin brand embedded in
 * their running text still counts as a whole word. */
const UNSPACED_SCRIPT_PATTERN =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]$/u;

/**
 * Collapses casing, whitespace and package-style punctuation so that
 * `@acme/email-sdk`, `email_sdk` and `Email SDK` share one form.
 */
function normalizeBrandText(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(SEPARATOR_PATTERN, " ")
    .trim();
}

function codePointBefore(text: string, index: number): string | undefined {
  if (index <= 0) {
    return undefined;
  }
  const low = text.charCodeAt(index - 1);
  if (low >= 0xdc00 && low <= 0xdfff && index >= 2) {
    const high = text.charCodeAt(index - 2);
    if (high >= 0xd800 && high <= 0xdbff) {
      return text.slice(index - 2, index);
    }
  }
  return text[index - 1];
}

function codePointAt(text: string, index: number): string | undefined {
  const codePoint = text.codePointAt(index);
  return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function isWordBoundary(character: string | undefined): boolean {
  if (character === undefined || !WORD_CHARACTER_PATTERN.test(character)) {
    return true;
  }
  return UNSPACED_SCRIPT_PATTERN.test(character);
}

function containsTerm(haystack: string, term: string): boolean {
  let from = 0;
  while (from <= haystack.length - term.length) {
    const index = haystack.indexOf(term, from);
    if (index === -1) {
      return false;
    }
    if (
      isWordBoundary(codePointBefore(haystack, index)) &&
      isWordBoundary(codePointAt(haystack, index + term.length))
    ) {
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
