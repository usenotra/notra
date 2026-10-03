import type { DailySummaryEmailItem } from "@notra/email/types/daily-summary";
import type {
  GeoChangeEvent,
  GeoChangesSummary,
} from "@notra/geo-core/types/geo";

import { DAILY_SUMMARY_MAX_COMPETITOR_NAMES } from "@/constants/daily-summary";
import type {
  BuildDailySummaryInput,
  BuiltDailySummary,
  DailySummaryMentionTotals,
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

function formatCompetitorNames(competitors: readonly string[]) {
  const shown = competitors.slice(0, DAILY_SUMMARY_MAX_COMPETITOR_NAMES);
  const hidden = competitors.length - shown.length;
  return hidden > 0 ? `${shown.join(", ")} +${hidden}` : shown.join(", ");
}

function formatRankMove(from: number | null, to: number | null) {
  return from !== null && to !== null ? ` from #${from} to #${to}` : "";
}

export function formatDailySummaryChangeDetail(
  event: Pick<GeoChangeEvent, "kind" | "previous" | "current" | "competitors">
) {
  const from = event.previous?.position ?? null;
  const to = event.current.position;

  switch (event.kind) {
    case "gained_mention":
      return to === null ? "Now mentioned" : `Now mentioned at #${to}`;
    case "lost_mention":
      return from === null
        ? "No longer mentioned"
        : `No longer mentioned (was #${from})`;
    case "competitor_displaced": {
      const names = formatCompetitorNames(event.competitors);
      if (!event.current.mentioned) {
        return names ? `Replaced by ${names}` : "Replaced by a competitor";
      }
      // The event only says these competitors are new to the answer, not that
      // they rank above the brand, so don't name them as the cause.
      return `Moved down${formatRankMove(from, to)}${names ? ` (new: ${names})` : ""}`;
    }
    case "position_improved":
      return `Moved up${formatRankMove(from, to)}`;
    case "position_dropped":
      return `Moved down${formatRankMove(from, to)}`;
    case "citation_added":
      return "Your site is now cited";
    case "citation_removed":
      return "Your site is no longer cited";
    case "competitor_cited":
      return `Cites ${formatCompetitorNames(event.competitors)}`;
    case "new_engine":
      return "First scan on this engine";
    default:
      return "Changed";
  }
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

// Only a mention appearing or disappearing justifies an email. Rank and owned
// citation flips are LLM sampling noise on their own, and a day-level mention
// rate swing without either usually just means prompts were added or removed.
export function isDailySummaryTrigger(
  event: Pick<GeoChangeEvent, "kind" | "current">
) {
  if (event.kind === "competitor_displaced") {
    return !event.current.mentioned;
  }

  return event.kind === "gained_mention" || event.kind === "lost_mention";
}

function answersNoun(count: number) {
  return count === 1 ? "AI answer" : "AI answers";
}

export function buildDailySummaryHeadline({
  gained,
  lost,
}: Pick<GeoChangesSummary, "gained" | "lost">) {
  if (gained > 0 && lost > 0) {
    return `You showed up in ${gained} new ${answersNoun(gained)} but dropped out of ${lost}.`;
  }

  if (gained > 0) {
    return `You showed up in ${gained} new ${answersNoun(gained)} yesterday.`;
  }

  if (lost > 0) {
    return `You dropped out of ${lost} ${answersNoun(lost)} yesterday.`;
  }

  return "Your AI visibility changed yesterday.";
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
    headline: buildDailySummaryHeadline(changes),
    mentionRateLabel,
    mentionRateDeltaLabel,
    scansCompleted,
    gained: changes.gained,
    lost: changes.lost,
    items,
    remainingCount,
  };
}
