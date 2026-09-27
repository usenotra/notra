import { CONTENT_TITLE_REGEX } from "@/constants/content-detail";
import { formatSnakeCaseLabel } from "@/utils/format";

export function extractTitleFromMarkdown(
  markdown: string,
  untitledLabel: string
): string {
  const match = markdown.match(CONTENT_TITLE_REGEX);
  return match?.[1] ?? untitledLabel;
}

export function formatLookbackWindow(window: string): string {
  return formatSnakeCaseLabel(window);
}

export function formatDateRange(
  start: string,
  end: string,
  locale: string
): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}
