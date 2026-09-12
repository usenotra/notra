import { editMarkdownOutputSchema } from "@notra/schemas/dashboard/ai/chat-tool-block";

import { DOCUMENT_DIFF_FALLBACK_FILENAME } from "@/constants/document-diff";
import type { DocumentDiffProps } from "@/types/content/document-diff";

export function getEditMarkdownDiff(output: unknown): DocumentDiffProps | null {
  const parsed = editMarkdownOutputSchema.safeParse(output);
  if (!parsed.success || parsed.data.success === false) {
    return null;
  }

  const previousMarkdown = parsed.data.previousMarkdown;
  const updatedMarkdown = parsed.data.updatedMarkdown;
  if (
    typeof previousMarkdown !== "string" ||
    typeof updatedMarkdown !== "string" ||
    previousMarkdown === updatedMarkdown
  ) {
    return null;
  }

  return {
    filename: parsed.data.filename || DOCUMENT_DIFF_FALLBACK_FILENAME,
    previousMarkdown,
    updatedMarkdown,
  };
}
