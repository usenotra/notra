const WHITESPACE = /\s+/;
const STARTS_WITH_LETTER_OR_DIGIT = /^[\p{L}\p{N}]/u;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function firstGrapheme(value: string): string {
  const [first] = graphemeSegmenter.segment(value);
  return first?.segment ?? "";
}

/**
 * Avatar initials from the first `limit` words. Works on graphemes, so an
 * emoji, a ZWJ sequence or a decomposed accent is never cut in half, and skips
 * words that start with punctuation ("Acme (staging)" → "A"). A name without
 * any letters (only emoji) falls back to its first grapheme.
 */
export function nameInitials(name: string, limit = 2): string {
  const trimmed = name.trim();
  const words = trimmed
    .split(WHITESPACE)
    .filter((word) => STARTS_WITH_LETTER_OR_DIGIT.test(word));
  if (words.length === 0) {
    return firstGrapheme(trimmed);
  }
  return words
    .slice(0, limit)
    .map((word) => firstGrapheme(word).toLocaleUpperCase())
    .join("");
}
