const WORDS_PER_MINUTE = 200;
const WHITESPACE_REGEX = /\s+/;

export function getReadingTimeMinutes(markdown: string) {
  const words = markdown.trim().split(WHITESPACE_REGEX).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
