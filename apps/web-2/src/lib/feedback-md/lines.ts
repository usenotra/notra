import type { FeedbackMdLine, FeedbackMdLineKind } from "@/types/feedback-md";

const TITLE_PREFIX = "# ";
const HEADING_PREFIX = "## ";
const LIST_PREFIX = "- ";

function classifyLine(line: string): FeedbackMdLineKind {
  if (line.length === 0) {
    return "blank";
  }
  if (line.startsWith(HEADING_PREFIX)) {
    return "heading";
  }
  if (line.startsWith(TITLE_PREFIX)) {
    return "title";
  }
  if (line.startsWith(LIST_PREFIX)) {
    return "list";
  }
  return "text";
}

export function parseFeedbackMdLines(source: string): FeedbackMdLine[] {
  let section: string | null = null;
  return source
    .trimEnd()
    .split("\n")
    .map((line) => {
      const kind = classifyLine(line);
      if (kind === "heading") {
        section = line.slice(HEADING_PREFIX.length);
      }
      return { kind, text: line, section };
    });
}

const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

export function feedbackMdHeadingId(heading: string): string {
  return `feedback-md-${heading.toLowerCase().replace(NON_ALPHANUMERIC, "-")}`;
}

export function feedbackMdLineId(line: FeedbackMdLine): string | undefined {
  if (line.kind !== "heading") {
    return undefined;
  }
  return feedbackMdHeadingId(line.text.slice(HEADING_PREFIX.length));
}
