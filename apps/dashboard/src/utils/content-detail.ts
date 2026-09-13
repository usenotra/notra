import { CONTENT_TITLE_REGEX } from "@/constants/content-detail";
import { formatSnakeCaseLabel } from "@/utils/format";

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function extractTitleFromMarkdown(markdown: string): string {
  const match = markdown.match(CONTENT_TITLE_REGEX);
  return match?.[1] ?? "Untitled";
}

export function formatLookbackWindow(window: string): string {
  return formatSnakeCaseLabel(window);
}

export function formatDateRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

export function formatTriggerType(type: string): string {
  if (type === "cron") {
    return "Schedule";
  }
  if (type === "github_webhook") {
    return "GitHub Webhook";
  }
  return formatSnakeCaseLabel(type);
}

export function formatRepos(repos: { owner: string; repo: string }[]): string {
  if (repos.length === 1 && repos[0]) {
    return `${repos[0].owner}/${repos[0].repo}`;
  }
  return `${repos.length} repositories`;
}

export function getPublishButtonLabel(
  isTogglingStatus: boolean,
  status: string
): string {
  if (isTogglingStatus) {
    return "Updating...";
  }
  if (status === "published") {
    return "Move to draft";
  }
  return "Publish";
}
