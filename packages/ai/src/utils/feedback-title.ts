import { FEEDBACK_CLASSIFIER_TITLE_MAX_LENGTH } from "@notra/ai/constants/feedback-classifier";

const WHITESPACE = /\s+/g;
const TRAILING_PUNCTUATION = /[.!?,;:]+$/;
const ELLIPSIS = "…";

/**
 * Title used when the LLM title generation fails but the typed
 * classification succeeded: the submitted title, else the first sentence of
 * the message, cut to the classifier's length limit.
 */
export function fallbackFeedbackTitle(
  message: string,
  submittedTitle?: string | null
): string {
  const source = (submittedTitle?.trim() || message).trim();
  const firstLine = source.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const compact = firstLine.replace(WHITESPACE, " ").trim();
  if (compact.length <= FEEDBACK_CLASSIFIER_TITLE_MAX_LENGTH) {
    return compact.replace(TRAILING_PUNCTUATION, "") || "Feedback";
  }
  const cutAt = FEEDBACK_CLASSIFIER_TITLE_MAX_LENGTH - ELLIPSIS.length;
  const cut = compact.slice(0, cutAt);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > cutAt / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(TRAILING_PUNCTUATION, "")}${ELLIPSIS}`;
}
