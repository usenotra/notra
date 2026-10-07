import type { ClaudeTextSegment } from "../types/claude";

const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

export const splitWithOffsets = (
  text: string,
  separator: string | RegExp,
  separatorLength: number
): ClaudeTextSegment[] => {
  const segments: ClaudeTextSegment[] = [];
  let offset = 0;
  for (const part of text.split(separator)) {
    if (part.length > 0) {
      segments.push({ offset, text: part });
    }
    offset += part.length + separatorLength;
  }
  return segments;
};

export const splitBoldSegments = (text: string): ClaudeTextSegment[] =>
  splitWithOffsets(text, BOLD_PATTERN, 0);
