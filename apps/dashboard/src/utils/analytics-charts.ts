import { formatDayLabel } from "@notra/geo-core/utils/day-label";

import {
  CURSOR_TOOLTIP_EDGE_PX,
  TOP_POST_CONTENT_PREVIEW_LENGTH,
} from "@/constants/analytics";
import type {
  AccountSeriesRow,
  AnalyticsHeroSummary,
  BestPostingSlot,
  CursorTipState,
  EngagementTimeseriesPoint,
  LeaderboardDetailMetric,
  NotraAdoptionResponse,
  PostingActivityLevel,
  PostingHeatmapCell,
  PostingPerformancePoint,
  PostingTimeSlot,
  SocialOverviewAccount,
} from "@/types/analytics";
import type { ChartMarker } from "@/types/charts";
import { chartKey } from "@/utils/chart-keys";

const PERCENT = 100;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatMetric(
  value: number | null,
  locale: string,
  notAvailableLabel: string
): string {
  if (value === null) {
    return notAvailableLabel;
  }
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatEngagementRate(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percent / PERCENT);
}

export function formatFullDayLabel(day: string, locale: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function accountSeriesKey(
  provider: string,
  providerAccountId: string
): string {
  return chartKey(`${provider}-${providerAccountId}`);
}

export function buildAccountSeriesRows(
  timelineDays: string[],
  accountKeys: string[],
  points: EngagementTimeseriesPoint[],
  metric: (point: EngagementTimeseriesPoint) => number,
  locale: string
): AccountSeriesRow[] {
  const valuesByDay = new Map<string, Map<string, number>>();
  for (const point of points) {
    const key = accountSeriesKey(point.provider, point.providerAccountId);
    const dayValues = valuesByDay.get(point.day) ?? new Map<string, number>();
    dayValues.set(key, (dayValues.get(key) ?? 0) + metric(point));
    valuesByDay.set(point.day, dayValues);
  }

  return timelineDays.map((day) => {
    const row: AccountSeriesRow = {
      day: formatDayLabel(day, locale),
      rawDay: day,
    };
    const dayValues = valuesByDay.get(day);
    for (const key of accountKeys) {
      row[key] = dayValues?.get(key) ?? 0;
    }
    return row;
  });
}

function markerLabelForDate(
  timelineDays: string[],
  isoDate: string | null,
  locale: string
): string | null {
  if (!isoDate) {
    return null;
  }
  const day = isoDate.slice(0, 10);
  const first = timelineDays.at(0);
  const last = timelineDays.at(-1);
  if (!(first && last) || day > last) {
    return null;
  }
  if (day < first) {
    return null;
  }
  const index = timelineDays.indexOf(day);
  return index === -1 ? null : formatDayLabel(day, locale);
}

export function sumMetric(
  accounts: SocialOverviewAccount[],
  metric: (account: SocialOverviewAccount) => number | null
): number | null {
  let total: number | null = null;
  for (const account of accounts) {
    const value = metric(account);
    if (value !== null) {
      total = (total ?? 0) + value;
    }
  }
  return total;
}

const HOURS_IN_DAY = 24;
const HIGH_ACTIVITY_SHARE = 0.75;
const MEDIUM_ACTIVITY_SHARE = 0.4;

function postingActivityLevel(
  avgEngagement: number,
  maxAvgEngagement: number
): PostingActivityLevel {
  if (avgEngagement <= 0 || maxAvgEngagement <= 0) {
    return "quiet";
  }
  const share = avgEngagement / maxAvgEngagement;
  if (share >= HIGH_ACTIVITY_SHARE) {
    return "high";
  }
  if (share >= MEDIUM_ACTIVITY_SHARE) {
    return "medium";
  }
  return "low";
}

export function buildPostingTimeSlots(
  points: PostingPerformancePoint[],
  weekday: number | null = null
): PostingTimeSlot[] {
  const source =
    weekday === null
      ? points
      : points.filter((point) => point.weekday === weekday);
  const totals = new Map<number, { posts: number; engagement: number }>();
  for (const point of source) {
    const entry = totals.get(point.hour) ?? { posts: 0, engagement: 0 };
    entry.posts += point.posts;
    entry.engagement += point.engagement;
    totals.set(point.hour, entry);
  }
  const slots = Array.from({ length: HOURS_IN_DAY }, (_, hour) => {
    const entry = totals.get(hour);
    const posts = entry?.posts ?? 0;
    return {
      hour,
      posts,
      avgEngagement: entry && posts > 0 ? entry.engagement / posts : 0,
    };
  });
  const maxAvgEngagement = slots.reduce(
    (max, slot) => Math.max(max, slot.avgEngagement),
    0
  );
  return slots.map((slot) => ({
    ...slot,
    level: postingActivityLevel(slot.avgEngagement, maxAvgEngagement),
  }));
}

const MIN_BEST_SLOT_POSTS = 2;

const WEEKDAYS_IN_WEEK = 7;

export function buildPostingHeatmap(
  points: PostingPerformancePoint[]
): PostingHeatmapCell[][] {
  const totals = new Map<string, { posts: number; engagement: number }>();
  for (const point of points) {
    const key = `${point.weekday}-${point.hour}`;
    const entry = totals.get(key) ?? { posts: 0, engagement: 0 };
    entry.posts += point.posts;
    entry.engagement += point.engagement;
    totals.set(key, entry);
  }
  const cells = Array.from({ length: WEEKDAYS_IN_WEEK }, (_, dayIndex) =>
    Array.from({ length: HOURS_IN_DAY }, (_, hour) => {
      const entry = totals.get(`${dayIndex + 1}-${hour}`);
      const posts = entry?.posts ?? 0;
      return {
        weekday: dayIndex + 1,
        hour,
        posts,
        avgEngagement: entry && posts > 0 ? entry.engagement / posts : 0,
      };
    })
  );
  const maxAvgEngagement = cells
    .flat()
    .reduce((max, cell) => Math.max(max, cell.avgEngagement), 0);
  return cells.map((row) =>
    row.map((cell) => ({
      ...cell,
      level: postingActivityLevel(cell.avgEngagement, maxAvgEngagement),
    }))
  );
}

export function findBestPostingSlot(
  points: PostingPerformancePoint[],
  weekday: number | null = null
): BestPostingSlot | null {
  const source =
    weekday === null
      ? points
      : points.filter((point) => point.weekday === weekday);
  const sampled = source.filter((point) => point.posts >= MIN_BEST_SLOT_POSTS);
  const candidates = sampled.length > 0 ? sampled : source;
  let best: PostingPerformancePoint | null = null;
  for (const point of candidates) {
    if (point.posts === 0) {
      continue;
    }
    const beatsAverage =
      best === null || point.avgEngagement > best.avgEngagement;
    const breaksTie =
      best !== null &&
      point.avgEngagement === best.avgEngagement &&
      point.posts > best.posts;
    if (beatsAverage || breaksTie) {
      best = point;
    }
  }
  if (best === null) {
    return null;
  }
  return {
    weekday: WEEKDAY_LABELS[best.weekday - 1] ?? "",
    hour: best.hour,
    posts: best.posts,
    avgEngagement: best.avgEngagement,
  };
}

const HOUR_PAD_LENGTH = 2;

export function formatHourRange(hour: number): string {
  const label = String(hour).padStart(HOUR_PAD_LENGTH, "0");
  return `${label}:00 - ${label}:59`;
}

export function cursorTipPosition(event: {
  clientX: number;
  clientY: number;
}): Pick<CursorTipState, "x" | "y" | "flip"> {
  return {
    x: event.clientX,
    y: event.clientY,
    flip: event.clientX > window.innerWidth - CURSOR_TOOLTIP_EDGE_PX,
  };
}

export function timezoneAbbreviation(locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

const MIN_SLOT_HEIGHT_PERCENT = 12;
const MAX_SLOT_HEIGHT_PERCENT = 100;

export function postingSlotHeightPercent(
  avgEngagement: number,
  maxAvgEngagement: number
): number {
  if (maxAvgEngagement <= 0 || avgEngagement <= 0) {
    return MIN_SLOT_HEIGHT_PERCENT;
  }
  return (
    MIN_SLOT_HEIGHT_PERCENT +
    (MAX_SLOT_HEIGHT_PERCENT - MIN_SLOT_HEIGHT_PERCENT) *
      (avgEngagement / maxAvgEngagement)
  );
}

export function buildAdoptionMarkers(
  timelineDays: string[],
  adoption: NotraAdoptionResponse | undefined,
  labels: { joined: string; firstPost: string },
  locale: string
): ChartMarker[] {
  const result: ChartMarker[] = [];
  const joined = markerLabelForDate(
    timelineDays,
    adoption?.organizationCreatedAt ?? null,
    locale
  );
  if (joined !== null) {
    result.push({ value: joined, label: labels.joined });
  }
  const firstPost = markerLabelForDate(
    timelineDays,
    adoption?.firstNotraPostAt ?? null,
    locale
  );
  if (firstPost !== null && firstPost !== joined) {
    result.push({ value: firstPost, label: labels.firstPost });
  }
  return result;
}

export function buildAnalyticsHeroSummary(
  accounts: SocialOverviewAccount[],
  points: EngagementTimeseriesPoint[]
): AnalyticsHeroSummary {
  const followers = sumMetric(accounts, (account) => account.followersCount);
  let impressions = 0;
  let interactions = 0;
  let posts = 0;
  for (const point of points) {
    impressions += point.impressions ?? 0;
    interactions +=
      (point.likes ?? 0) + (point.replies ?? 0) + (point.reposts ?? 0);
    posts += point.posts;
  }
  const engagementRate =
    impressions > 0 ? (interactions / impressions) * PERCENT : null;
  return { followers, impressions, interactions, posts, engagementRate };
}

const WHITESPACE_REGEX = /\s+/g;

export function previewPostContent(content: string): string {
  const singleLine = content.replace(WHITESPACE_REGEX, " ").trim();
  if (singleLine.length <= TOP_POST_CONTENT_PREVIEW_LENGTH) {
    return singleLine;
  }
  return `${singleLine.slice(0, TOP_POST_CONTENT_PREVIEW_LENGTH)}\u2026`;
}

export function leaderboardDetailMetrics(
  account: SocialOverviewAccount,
  locale: string,
  notAvailableLabel: string
): LeaderboardDetailMetric[] {
  const interactions =
    (account.likes ?? 0) + (account.replies ?? 0) + (account.reposts ?? 0);
  const engagementRate =
    account.impressions && account.impressions > 0
      ? formatEngagementRate(
          (interactions / account.impressions) * PERCENT,
          locale
        )
      : notAvailableLabel;
  return [
    {
      labelKey: "followers",
      value: formatMetric(account.followersCount, locale, notAvailableLabel),
    },
    {
      labelKey: "impressions",
      value: formatMetric(account.impressions, locale, notAvailableLabel),
    },
    {
      labelKey: "likes",
      value: formatMetric(account.likes, locale, notAvailableLabel),
    },
    {
      labelKey: "replies",
      value: formatMetric(account.replies, locale, notAvailableLabel),
    },
    {
      labelKey: "reposts",
      value: formatMetric(account.reposts, locale, notAvailableLabel),
    },
    {
      labelKey: "quotes",
      value: formatMetric(account.quotes, locale, notAvailableLabel),
    },
    {
      labelKey: "bookmarks",
      value: formatMetric(account.bookmarks, locale, notAvailableLabel),
    },
    { labelKey: "engagementRate", value: engagementRate },
  ];
}
