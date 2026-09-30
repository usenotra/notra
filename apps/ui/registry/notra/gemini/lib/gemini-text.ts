import type { GeminiTextSegment } from "../types/gemini";

const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

const CITE_PATTERN = /(\{\{[a-z0-9-]+\}\})/g;

const PARAGRAPH_SEPARATOR = "\n\n";

export const splitWithOffsets = (
  text: string,
  separator: string | RegExp,
  separatorLength: number
): GeminiTextSegment[] => {
  const segments: GeminiTextSegment[] = [];
  let offset = 0;
  for (const part of text.split(separator)) {
    if (part.length > 0) {
      segments.push({ offset, text: part });
    }
    offset += part.length + separatorLength;
  }
  return segments;
};

export const splitGeminiParagraphs = (text: string): GeminiTextSegment[] =>
  splitWithOffsets(text, PARAGRAPH_SEPARATOR, PARAGRAPH_SEPARATOR.length);

export const splitGeminiBold = (text: string): GeminiTextSegment[] =>
  splitWithOffsets(text, BOLD_PATTERN, 0);

export const splitGeminiCitations = (text: string): GeminiTextSegment[] =>
  splitWithOffsets(text, CITE_PATTERN, 0);

export const geminiCitationId = (text: string): string | null =>
  text.match(/^\{\{([a-z0-9-]+)\}\}$/)?.[1] ?? null;
