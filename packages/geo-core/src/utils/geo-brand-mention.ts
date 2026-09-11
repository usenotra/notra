const SEPARATOR_PATTERN = /[\s\-_/@.]+/g;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}]/u;

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

function containsTerm(haystack: string, term: string): boolean {
  let from = 0;
  while (from <= haystack.length - term.length) {
    const index = haystack.indexOf(term, from);
    if (index === -1) {
      return false;
    }
    const before = haystack[index - 1];
    const after = haystack[index + term.length];
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
