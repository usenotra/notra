import type {
  GeoCheckPeriodCompetitorRow,
  GeoCheckPeriodPromptRow,
} from "@notra/db/types/geo-checks";

import {
  GEO_ALERT_BASELINE_DAYS,
  GEO_ALERT_MIN_DROP_POINTS,
  GEO_ALERT_MIN_RECENT_CHECKS,
  GEO_ALERT_RECENT_DAYS,
  GEO_RECAP_DAY_MS,
  GEO_RECAP_MENTIONED_RATE,
  GEO_RECAP_MIN_CHECKS_PER_PERIOD,
  GEO_RECAP_MIN_RANK_SHIFT,
  GEO_RECAP_MIN_RATE_SWING,
  GEO_RECAP_MIN_SHARE_POINTS,
  GEO_RECAP_QUIET_MAX_DAY_OF_MONTH,
  GEO_RECAP_WEEK_DAYS,
} from "@/constants/geo-recap";
import type {
  GeoRecapCompetitorShare,
  GeoRecapPair,
  GeoRecapPairChange,
  GeoRecapPeriodStats,
  GeoRecapRate,
  GeoRecapWindow,
} from "@/types/email/geo-recap";

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function daysBefore(date: Date, days: number) {
  return new Date(date.getTime() - days * GEO_RECAP_DAY_MS);
}

/** Last full Monday–Sunday week (current) and the week before (previous). */
export function getPreviousWeekWindow(now: Date): GeoRecapWindow {
  const today = startOfUtcDay(now);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const toExclusive = daysBefore(today, daysSinceMonday);
  const splitAt = daysBefore(toExclusive, GEO_RECAP_WEEK_DAYS);
  return {
    from: daysBefore(splitAt, GEO_RECAP_WEEK_DAYS),
    splitAt,
    toExclusive,
  };
}

/** The last full days before `now` against the baseline days before them. */
export function getDropAlertWindow(now: Date, daysBack = 0): GeoRecapWindow {
  const toExclusive = daysBefore(startOfUtcDay(now), daysBack);
  const splitAt = daysBefore(toExclusive, GEO_ALERT_RECENT_DAYS);
  return {
    from: daysBefore(splitAt, GEO_ALERT_BASELINE_DAYS),
    splitAt,
    toExclusive,
  };
}

export function formatWeekLabel(window: GeoRecapWindow) {
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${format(window.splitAt)} – ${format(daysBefore(window.toExclusive, 1))}`;
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

function pairKey(row: { projectId: string; promptId: string; engine: string }) {
  return `${row.projectId}:${row.promptId}:${row.engine}`;
}

const EMPTY_STATS: GeoRecapPeriodStats = {
  checks: 0,
  mentions: 0,
  avgPosition: null,
};

/**
 * Pairs answered often enough in both periods. Prompts added or paused during
 * the window drop out, so they can't move visibility on their own.
 */
export function buildComparablePairs(
  rows: readonly GeoCheckPeriodPromptRow[],
  minCurrentChecks = GEO_RECAP_MIN_CHECKS_PER_PERIOD
): GeoRecapPair[] {
  const pairs = new Map<string, GeoRecapPair>();
  for (const row of rows) {
    const key = pairKey(row);
    const pair = pairs.get(key) ?? {
      key,
      projectId: row.projectId,
      promptId: row.promptId,
      engine: row.engine,
      prompt: row.prompt,
      previous: EMPTY_STATS,
      current: EMPTY_STATS,
    };
    const stats = {
      checks: row.checks,
      mentions: row.mentions,
      avgPosition: row.avgPosition,
    };
    if (row.period === "current") {
      pair.current = stats;
      pair.prompt = row.prompt;
    } else {
      pair.previous = stats;
    }
    pairs.set(key, pair);
  }

  return [...pairs.values()].filter(
    (pair) =>
      pair.previous.checks >= GEO_RECAP_MIN_CHECKS_PER_PERIOD &&
      pair.current.checks >= minCurrentChecks
  );
}

function rate(stats: GeoRecapPeriodStats) {
  return stats.checks === 0 ? 0 : stats.mentions / stats.checks;
}

export function classifyPairChange(
  pair: GeoRecapPair
): GeoRecapPairChange | null {
  const before = rate(pair.previous);
  const after = rate(pair.current);
  const swing = after - before;

  if (
    swing >= GEO_RECAP_MIN_RATE_SWING &&
    before < GEO_RECAP_MENTIONED_RATE &&
    after >= GEO_RECAP_MENTIONED_RATE
  ) {
    return { pair, kind: "gained" };
  }
  if (
    -swing >= GEO_RECAP_MIN_RATE_SWING &&
    before >= GEO_RECAP_MENTIONED_RATE &&
    after < GEO_RECAP_MENTIONED_RATE
  ) {
    return { pair, kind: "lost" };
  }

  // Rank only means something where the brand shows up most of the time.
  const from = pair.previous.avgPosition;
  const to = pair.current.avgPosition;
  if (
    from === null ||
    to === null ||
    before < GEO_RECAP_MENTIONED_RATE ||
    after < GEO_RECAP_MENTIONED_RATE
  ) {
    return null;
  }
  if (from - to >= GEO_RECAP_MIN_RANK_SHIFT) {
    return { pair, kind: "rank_up" };
  }
  if (to - from >= GEO_RECAP_MIN_RANK_SHIFT) {
    return { pair, kind: "rank_down" };
  }
  return null;
}

const CHANGE_ORDER: Record<GeoRecapPairChange["kind"], number> = {
  lost: 0,
  gained: 1,
  rank_down: 2,
  rank_up: 3,
};

/** Biggest swings first; losses before gains so bad news isn't buried. */
export function collectPairChanges(
  pairs: readonly GeoRecapPair[]
): GeoRecapPairChange[] {
  return pairs
    .flatMap((pair) => {
      const change = classifyPairChange(pair);
      return change ? [change] : [];
    })
    .toSorted(
      (left, right) =>
        CHANGE_ORDER[left.kind] - CHANGE_ORDER[right.kind] ||
        Math.abs(rate(right.pair.current) - rate(right.pair.previous)) -
          Math.abs(rate(left.pair.current) - rate(left.pair.previous))
    );
}

export function formatPairChangeDetail({ pair, kind }: GeoRecapPairChange) {
  if (kind === "gained" || kind === "lost") {
    return `In ${pair.current.mentions} of ${pair.current.checks} answers, was ${pair.previous.mentions} of ${pair.previous.checks}`;
  }
  const from = Math.round(pair.previous.avgPosition ?? 0);
  const to = Math.round(pair.current.avgPosition ?? 0);
  return `Average rank from #${from} to #${to}`;
}

/**
 * Mean of per-pair mention rates, so every prompt and engine weighs the same
 * in both periods. Pooling answers would let a missed scan or a second daily
 * scan on some prompts shift the total while no single rate moved.
 */
export function aggregateRates(pairs: readonly GeoRecapPair[]): {
  previous: GeoRecapRate;
  current: GeoRecapRate;
} {
  const total = (period: "previous" | "current"): GeoRecapRate => {
    let checks = 0;
    let rateSum = 0;
    for (const pair of pairs) {
      checks += pair[period].checks;
      rateSum += rate(pair[period]);
    }
    return { checks, rate: pairs.length === 0 ? null : rateSum / pairs.length };
  };
  return { previous: total("previous"), current: total("current") };
}

/**
 * Share of comparable answers each competitor showed up in, per period,
 * weighted per pair like `aggregateRates`.
 */
export function competitorShares(
  rows: readonly GeoCheckPeriodCompetitorRow[],
  pairs: readonly GeoRecapPair[]
): GeoRecapCompetitorShare[] {
  const byKey = new Map(pairs.map((pair) => [pair.key, pair]));
  const sums = new Map<
    string,
    { brand: string; previous: number; current: number }
  >();
  for (const row of rows) {
    const pair = byKey.get(pairKey(row));
    const checks = pair?.[row.period].checks ?? 0;
    if (checks === 0) {
      continue;
    }
    const entry = sums.get(row.brandKey) ?? {
      brand: row.brand,
      previous: 0,
      current: 0,
    };
    entry[row.period] += row.checks / checks;
    sums.set(row.brandKey, entry);
  }

  return [...sums.values()]
    .map((entry) => ({
      brand: entry.brand,
      previous: entry.previous / pairs.length,
      current: entry.current / pairs.length,
    }))
    .toSorted((left, right) => right.current - left.current);
}

export function sharePoints(from: number | null, to: number | null) {
  if (from === null || to === null) {
    return null;
  }
  return Math.round((to - from) * 100);
}

export function formatRate(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatPoints(points: number | null) {
  if (points === null) {
    return "—";
  }
  if (points === 0) {
    return "unchanged";
  }
  return points > 0 ? `+${points} pts` : `−${Math.abs(points)} pts`;
}

export function isNewsworthyShift(points: number | null) {
  return points !== null && Math.abs(points) >= GEO_RECAP_MIN_SHARE_POINTS;
}

/**
 * Quiet weeks still send once a month so the recap doesn't vanish for good,
 * on the first Monday (its week ends in the month's first days).
 */
export function shouldSendQuietWeek(window: GeoRecapWindow) {
  return window.toExclusive.getUTCDate() <= GEO_RECAP_QUIET_MAX_DAY_OF_MONTH;
}

function answersNoun(count: number) {
  return count === 1 ? "AI answer" : "AI answers";
}

export function buildWeeklyHeadline({
  gained,
  lost,
  visibilityPoints,
  visibilityLabel,
  topMover,
}: {
  gained: number;
  lost: number;
  visibilityPoints: number | null;
  visibilityLabel: string;
  topMover?: { brand: string; points: number };
}) {
  if (gained > 0 && lost > 0) {
    return `You're now a regular in ${gained} more ${answersNoun(gained)} and dropped out of ${lost}.`;
  }
  if (gained > 0) {
    return `You're now a regular in ${gained} more ${answersNoun(gained)}.`;
  }
  if (lost > 0) {
    return `You dropped out of ${lost} ${answersNoun(lost)} you used to show up in.`;
  }
  if (isNewsworthyShift(visibilityPoints) && visibilityPoints !== null) {
    return visibilityPoints > 0
      ? `Your AI visibility rose to ${visibilityLabel}.`
      : `Your AI visibility slipped to ${visibilityLabel}.`;
  }
  if (topMover) {
    return topMover.points > 0
      ? `${topMover.brand} gained ${topMover.points} pts of AI answers.`
      : `${topMover.brand} lost ${Math.abs(topMover.points)} pts of AI answers.`;
  }
  return `A steady week: visibility held at ${visibilityLabel}.`;
}

/** Sharp drops in recent days, measured on the same comparable pairs. */
export function detectVisibilityDrop(pairs: readonly GeoRecapPair[]) {
  const { previous, current } = aggregateRates(pairs);
  const points = sharePoints(previous.rate, current.rate);
  if (
    points === null ||
    current.checks < GEO_ALERT_MIN_RECENT_CHECKS ||
    -points < GEO_ALERT_MIN_DROP_POINTS
  ) {
    return null;
  }
  return { previous, current, points };
}
