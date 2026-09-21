export interface TextSegment {
  /** Character offset of the segment within the source text — stable key. */
  offset: number;
  text: string;
}

/**
 * Splits `text` on `separator` and annotates each piece with its character
 * offset, so callers get a stable React key without mutating a counter during
 * render (which React Compiler can't optimize).
 */
export function splitWithOffsets(
  text: string,
  separator: string | RegExp,
  separatorLength: number
): TextSegment[] {
  const segments: TextSegment[] = [];
  let offset = 0;
  for (const part of text.split(separator)) {
    // A capturing split yields "" before a leading match; it renders nothing
    // and would share its offset (and React key) with that match.
    if (part.length > 0) {
      segments.push({ offset, text: part });
    }
    offset += part.length + separatorLength;
  }
  return segments;
}

const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

/** Splits inline `**bold**` markup into offset-keyed segments. */
export function splitBoldSegments(text: string): TextSegment[] {
  return splitWithOffsets(text, BOLD_PATTERN, 0);
}
