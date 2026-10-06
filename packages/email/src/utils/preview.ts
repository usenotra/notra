/** Inboxes cut preview text at roughly 90 characters. */
const PREVIEW_MAX_LENGTH = 90;
const WHITESPACE_REGEX = /\s+/g;

export function toPreviewText(text: string): string {
  const flat = text.replace(WHITESPACE_REGEX, " ").trim();
  return flat.length > PREVIEW_MAX_LENGTH
    ? `${flat.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`
    : flat;
}
