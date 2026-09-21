import type { DailySummaryEmailItem } from "@notra/email/types/daily-summary";
import { GEO_CHANGE_KIND_LABELS } from "@notra/geo-core/constants/geo";
import type {
  GeoChangeKind,
  GeoChangesSummary,
} from "@notra/geo-core/types/geo";

import type {
  BuildDailySummaryInput,
  BuiltDailySummary,
  DailySummaryMentionTotals,
  DailySummaryUnchangedInput,
  DailySummaryWindow,
} from "@/types/email/daily-summary";

export function getPreviousUtcDayWindow(now: Date): DailySummaryWindow {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);

  return { start, end };
}

export function formatUtcDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function truncatePrompt(prompt: string, maxLength: number) {
  const collapsed = prompt.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

export function groupDailySummaryItems(
  items: readonly DailySummaryEmailItem[]
): DailySummaryEmailItem[] {
  const grouped = new Map<string, DailySummaryEmailItem>();

  for (const item of items) {
    const existing = grouped.get(item.id);
    if (existing) {
      existing.changes.push(...item.changes);
    } else {
      grouped.set(item.id, { ...item, changes: [...item.changes] });
    }
  }

  return [...grouped.values()];
}

export function formatDailySummaryChangeDetail(
  kind: GeoChangeKind,
  competitors: readonly string[]
) {
  const label = GEO_CHANGE_KIND_LABELS[kind];
  if (kind !== "competitor_cited" || competitors.length === 0) {
    return label;
  }

  return `${label}: ${competitors.join(", ")}`;
}

export function aggregateMentionTotals(
  rows: readonly { checks: number; mentions: number }[]
): DailySummaryMentionTotals {
  const checks = rows.reduce((sum, row) => sum + row.checks, 0);
  const mentions = rows.reduce((sum, row) => sum + row.mentions, 0);

  return {
    checks,
    mentions,
    rate: checks === 0 ? null : mentions / checks,
  };
}

export function formatMentionRate(rate: number | null) {
  if (rate === null) {
    return "—";
  }

  return `${Math.round(rate * 100)}%`;
}

export function formatMentionRateDelta(
  yesterday: number | null,
  previousDay: number | null
) {
  if (yesterday === null || previousDay === null) {
    return "—";
  }

  const points = Math.round((yesterday - previousDay) * 100);
  if (points === 0) {
    return "unchanged";
  }

  if (points > 0) {
    return `+${points} pts`;
  }

  return `${points} pts`;
}

export function isQuietDailySummary({
  scansCompleted,
  yesterdayChecks,
}: {
  scansCompleted: number;
  yesterdayChecks: number;
}) {
  return scansCompleted === 0 && yesterdayChecks === 0;
}

export function isUnchangedDailySummary({
  yesterday,
  previousDay,
  changes,
  hasNewEngine,
}: DailySummaryUnchangedInput) {
  return (
    !hasNewEngine &&
    formatMentionRateDelta(yesterday.rate, previousDay.rate) === "unchanged" &&
    changes.gained === changes.lost &&
    changes.positionImproved === changes.positionDropped &&
    changes.citationsAdded === changes.citationsRemoved
  );
}

export function buildDailySummaryHeadline({
  gained,
  lost,
  mentionRateLabel,
}: {
  gained: number;
  lost: number;
  mentionRateLabel: string;
}) {
  if (gained > 0 && lost > 0) {
    const gainedNoun = gained === 1 ? "prompt" : "prompts";
    return `You gained ${gained} ${gainedNoun} but lost ${lost} yesterday.`;
  }

  if (gained > 0) {
    const promptNoun = gained === 1 ? "prompt" : "prompts";
    return `You gained ${gained} ${promptNoun} yesterday.`;
  }

  if (lost > 0) {
    const promptNoun = lost === 1 ? "prompt" : "prompts";
    return `You lost ${lost} ${promptNoun} yesterday.`;
  }

  return mentionRateLabel === "—"
    ? "Yesterday's scan finished. Your GEO recap is ready."
    : `Yesterday's visibility: ${mentionRateLabel}.`;
}

export function emptyChangesSummary(): GeoChangesSummary {
  return {
    gained: 0,
    lost: 0,
    positionImproved: 0,
    positionDropped: 0,
    citationsAdded: 0,
    citationsRemoved: 0,
  };
}

export function mergeChangesSummaries(
  summaries: readonly GeoChangesSummary[]
): GeoChangesSummary {
  return summaries.reduce<GeoChangesSummary>(
    (merged, summary) => ({
      gained: merged.gained + summary.gained,
      lost: merged.lost + summary.lost,
      positionImproved: merged.positionImproved + summary.positionImproved,
      positionDropped: merged.positionDropped + summary.positionDropped,
      citationsAdded: merged.citationsAdded + summary.citationsAdded,
      citationsRemoved: merged.citationsRemoved + summary.citationsRemoved,
    }),
    emptyChangesSummary()
  );
}

export function buildDailySummary({
  windowStart,
  scansCompleted,
  yesterday,
  previousDay,
  changes,
  items,
  remainingCount,
}: BuildDailySummaryInput): BuiltDailySummary {
  const mentionRateLabel = formatMentionRate(yesterday.rate);
  const mentionRateDeltaLabel = formatMentionRateDelta(
    yesterday.rate,
    previousDay.rate
  );
  return {
    dateLabel: formatUtcDateLabel(windowStart),
    headline: buildDailySummaryHeadline({
      mentionRateLabel,
      gained: changes.gained,
      lost: changes.lost,
    }),
    mentionRateLabel,
    mentionRateDeltaLabel,
    scansCompleted,
    gained: changes.gained,
    lost: changes.lost,
    items,
    remainingCount,
  };
}
