import type { QueryResult } from "@tinybirdco/sdk";

import {
  DEMO_SOCIAL_BASE_FOLLOWERS,
  DEMO_SOCIAL_BASE_IMPRESSIONS,
  DEMO_SOCIAL_DAILY_GROWTH,
  DEMO_SOCIAL_HISTORY_DAYS,
  DEMO_SOCIAL_NOTRA_ADOPTED_DAYS_AGO,
  DEMO_SOCIAL_NOTRA_LIFT,
  DEMO_SOCIAL_OWN_POSTS,
  DEMO_SOCIAL_POST_CHANCE,
  DEMO_SOCIAL_POSTING_HOURS,
  DEMO_SOCIAL_TRACKED_POSTS,
} from "../constants/demo-social";
import type {
  DemoSocialAccount,
  DemoSocialAccountsProvider,
  DemoSocialParams,
  DemoSocialPost,
} from "../types/demo-social";
import { toClickHouseDateTime } from "../utils/datetime";
import { readNumber, readString } from "../utils/demo-params";

/**
 * The public demo has no Tinybird. Social analytics are generated from the
 * organization's (fictional) connected and tracked accounts: every account
 * and day seeds its own random stream, so history is stable while "now"
 * moves forward and newly tracked accounts get data straight away. These
 * mirror the endpoints in `pipes/social.ts`.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Snapshot time of the daily follower count, in UTC hours. */
const FOLLOWER_SNAPSHOT_HOUR = 6;
const DEFAULT_TIME_ZONE = "UTC";

const PROVIDER_KEY = Symbol.for("notra.demo.socialAccountsProvider");
type ProviderHolder = { [PROVIDER_KEY]?: DemoSocialAccountsProvider | null };

/** Registered once at startup by the host app (dashboard or API). */
export function setDemoSocialAccountsProvider(
  next: DemoSocialAccountsProvider | null
) {
  (globalThis as ProviderHolder)[PROVIDER_KEY] = next;
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast and good enough for believable demo numbers. */
function seededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function providerKey(provider: string): "twitter" | "linkedin" {
  return provider === "linkedin" ? "linkedin" : "twitter";
}

function accountScale(
  account: Pick<DemoSocialAccount, "providerAccountId">
): number {
  return between(seededRandom(`scale:${account.providerAccountId}`), 0.7, 1.4);
}

/** Follower count at a moment, compounding growth backwards from today. */
export function demoSocialFollowers(
  account: Pick<DemoSocialAccount, "provider" | "providerAccountId" | "kind">,
  at: Date,
  now: Date
): number {
  const base =
    DEMO_SOCIAL_BASE_FOLLOWERS[account.kind][providerKey(account.provider)];
  const scale = accountScale(account);
  const daysAgo = Math.max(0, (now.getTime() - at.getTime()) / DAY_MS);
  const noise = between(
    seededRandom(
      `followers:${account.providerAccountId}:${Math.floor(at.getTime() / DAY_MS)}`
    ),
    -0.002,
    0.002
  );
  return Math.round(
    base * scale * (1 - DEMO_SOCIAL_DAILY_GROWTH) ** daysAgo * (1 + noise)
  );
}

function postUrl(account: DemoSocialAccount, platformPostId: string) {
  return account.provider === "twitter"
    ? `https://x.com/${account.username}/status/${platformPostId}`
    : null;
}

function postsForAccount(
  account: DemoSocialAccount,
  now: Date
): DemoSocialPost[] {
  const provider = providerKey(account.provider);
  const chance = DEMO_SOCIAL_POST_CHANCE[account.kind][provider];
  const baseImpressions =
    DEMO_SOCIAL_BASE_IMPRESSIONS[account.kind][provider] *
    accountScale(account);
  const texts =
    account.kind === "connected"
      ? DEMO_SOCIAL_OWN_POSTS[provider]
      : DEMO_SOCIAL_TRACKED_POSTS;
  const today = Math.floor(now.getTime() / DAY_MS);
  const adoptedDay = today - DEMO_SOCIAL_NOTRA_ADOPTED_DAYS_AGO;
  const posts: DemoSocialPost[] = [];

  for (let day = today - DEMO_SOCIAL_HISTORY_DAYS; day <= today; day += 1) {
    const random = seededRandom(`post:${account.providerAccountId}:${day}`);
    if (random() > chance) {
      continue;
    }
    const postedAt = new Date(
      day * DAY_MS +
        pick(random, DEMO_SOCIAL_POSTING_HOURS) * HOUR_MS +
        Math.floor(random() * 60) * 60_000
    );
    if (postedAt > now) {
      continue;
    }
    const viaNotra = account.kind === "connected" && day >= adoptedDay;
    // Fresh posts are still collecting impressions.
    const ageHours = (now.getTime() - postedAt.getTime()) / HOUR_MS;
    const maturity = Math.min(1, 0.3 + ageHours / 72);
    const impressions = Math.round(
      baseImpressions *
        between(random, 0.35, 2.6) *
        (viaNotra ? DEMO_SOCIAL_NOTRA_LIFT : 1) *
        maturity
    );
    const likes = Math.round(impressions * between(random, 0.015, 0.04));
    const reposts = Math.round(likes * between(random, 0.08, 0.25));
    const platformPostId = `${1_800_000_000_000 + day * 1000 + (hashString(account.providerAccountId) % 1000)}`;
    posts.push({
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      platformPostId,
      content: pick(random, texts),
      url: postUrl(account, platformPostId),
      postedAt,
      impressions,
      likes,
      replies: Math.round(likes * between(random, 0.06, 0.18)),
      reposts,
      quotes: Math.round(reposts * between(random, 0.1, 0.3)),
      bookmarks: Math.round(likes * between(random, 0.08, 0.2)),
      viaNotra,
    });
  }
  return posts;
}

const localFormatters = new Map<string, Intl.DateTimeFormat>();

function localFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = localFormatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        weekday: "short",
      });
    } catch {
      formatter = localFormatter(DEFAULT_TIME_ZONE);
    }
    localFormatters.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local calendar day, ISO weekday (Mon = 1, like ClickHouse) and hour. */
function localParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    localFormatter(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday ?? "Mon") + 1,
    hour: Number(parts.hour),
  };
}

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function daySpan(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
    ) + 1
  );
}

/** Mirrors the pipes' "trailing days, or local date_from..date_to" filter. */
function inWindow(
  at: Date,
  params: DemoSocialParams,
  defaultDays: number,
  now: Date
): boolean {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  const day = localParts(at, timeZone).day;
  if (params.date_to && day > params.date_to) {
    return false;
  }
  if (!params.date_from) {
    return (
      at.getTime() >= now.getTime() - (params.days ?? defaultDays) * DAY_MS
    );
  }
  return day >= params.date_from;
}

function engagementOf(post: DemoSocialPost): number {
  return post.likes + post.replies + post.reposts;
}

interface DemoSocialData {
  accounts: DemoSocialAccount[];
  posts: DemoSocialPost[];
}

function overview(
  { accounts, posts }: DemoSocialData,
  _params: DemoSocialParams,
  now: Date
) {
  const snapshot = new Date(
    Math.floor(now.getTime() / DAY_MS) * DAY_MS +
      FOLLOWER_SNAPSHOT_HOUR * HOUR_MS
  );
  const capturedAt =
    snapshot > now ? new Date(snapshot.getTime() - DAY_MS) : snapshot;
  return accounts
    .map((account) => {
      const own = posts.filter(
        (post) =>
          post.provider === account.provider &&
          post.providerAccountId === account.providerAccountId
      );
      const random = seededRandom(`profile:${account.providerAccountId}`);
      const sum = (
        key:
          | "impressions"
          | "likes"
          | "replies"
          | "reposts"
          | "quotes"
          | "bookmarks"
      ) => own.reduce((total, post) => total + post[key], 0);
      return {
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        account_id: account.providerAccountId,
        username: account.username,
        display_name: account.displayName,
        profile_image_url: account.profileImageUrl,
        verified: account.verified,
        followers_count: demoSocialFollowers(account, capturedAt, now),
        following_count: Math.round(between(random, 280, 950)),
        posts_count: Math.round(between(random, 900, 3200)),
        tracked_posts: own.length,
        impressions: sum("impressions"),
        likes: sum("likes"),
        replies: sum("replies"),
        reposts: sum("reposts"),
        quotes: sum("quotes"),
        bookmarks: sum("bookmarks"),
        stats_captured_at: toClickHouseDateTime(capturedAt),
      };
    })
    .toSorted((a, b) => b.followers_count - a.followers_count);
}

function engagementTimeseries(
  { posts }: DemoSocialData,
  params: DemoSocialParams,
  now: Date
) {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  const buckets = new Map<
    string,
    {
      day: string;
      provider: string;
      provider_account_id: string;
      posts: number;
      impressions: number;
      likes: number;
      replies: number;
      reposts: number;
    }
  >();
  for (const post of posts) {
    if (!inWindow(post.postedAt, params, 30, now)) {
      continue;
    }
    const day = localParts(post.postedAt, timeZone).day;
    const key = `${day}:${post.provider}:${post.providerAccountId}`;
    const bucket = buckets.get(key) ?? {
      day,
      provider: post.provider,
      provider_account_id: post.providerAccountId,
      posts: 0,
      impressions: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
    };
    bucket.posts += 1;
    bucket.impressions += post.impressions;
    bucket.likes += post.likes;
    bucket.replies += post.replies;
    bucket.reposts += post.reposts;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].toSorted((a, b) => a.day.localeCompare(b.day));
}

function leaderboard(
  { posts }: DemoSocialData,
  params: DemoSocialParams,
  now: Date
) {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  const days = params.days ?? 7;
  const isCurrent = (post: DemoSocialPost): boolean | null => {
    if (!params.date_from) {
      const age = now.getTime() - post.postedAt.getTime();
      if (age < 0 || age > days * 2 * DAY_MS) {
        return null;
      }
      return age <= days * DAY_MS;
    }
    const to = params.date_to || localParts(now, timeZone).day;
    const from = shiftDay(params.date_from, -daySpan(params.date_from, to));
    const day = localParts(post.postedAt, timeZone).day;
    if (day < from || day > to) {
      return null;
    }
    return day >= params.date_from;
  };

  const totals = new Map<
    string,
    {
      provider: string;
      provider_account_id: string;
      posts: number;
      interactions: number;
      impressions: number;
      prev_posts: number;
      prev_interactions: number;
      prev_impressions: number;
    }
  >();
  for (const post of posts) {
    const current = isCurrent(post);
    if (current === null) {
      continue;
    }
    const key = `${post.provider}:${post.providerAccountId}`;
    const row = totals.get(key) ?? {
      provider: post.provider,
      provider_account_id: post.providerAccountId,
      posts: 0,
      interactions: 0,
      impressions: 0,
      prev_posts: 0,
      prev_interactions: 0,
      prev_impressions: 0,
    };
    if (current) {
      row.posts += 1;
      row.interactions += engagementOf(post);
      row.impressions += post.impressions;
    } else {
      row.prev_posts += 1;
      row.prev_interactions += engagementOf(post);
      row.prev_impressions += post.impressions;
    }
    totals.set(key, row);
  }
  return [...totals.values()].toSorted(
    (a, b) => b.interactions - a.interactions
  );
}

function postRow(post: DemoSocialPost) {
  return {
    provider: post.provider,
    platform_post_id: post.platformPostId,
    provider_account_id: post.providerAccountId,
    content: post.content,
    url: post.url,
    impressions: post.impressions,
    likes: post.likes,
    replies: post.replies,
    reposts: post.reposts,
    bookmarks: post.bookmarks,
  };
}

function topPosts(
  { accounts, posts }: DemoSocialData,
  params: DemoSocialParams
) {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  // Only the organization's own accounts: tracked accounts are benchmarks.
  const own = new Set(
    accounts
      .filter((account) => account.kind === "connected")
      .map((account) => `${account.provider}:${account.providerAccountId}`)
  );
  return posts
    .filter((post) => {
      if (!own.has(`${post.provider}:${post.providerAccountId}`)) {
        return false;
      }
      const day = localParts(post.postedAt, timeZone).day;
      return (
        (!params.date_from || day >= params.date_from) &&
        (!params.date_to || day <= params.date_to)
      );
    })
    .toSorted(
      (a, b) =>
        engagementOf(b) - engagementOf(a) ||
        b.postedAt.getTime() - a.postedAt.getTime()
    )
    .slice(0, params.limit ?? 10)
    .map((post) => ({
      ...postRow(post),
      posted_at: toClickHouseDateTime(post.postedAt),
      engagement: engagementOf(post),
    }));
}

function postingPerformance(
  { posts }: DemoSocialData,
  params: DemoSocialParams,
  now: Date
) {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  const slots = new Map<
    string,
    {
      weekday: number;
      hour: number;
      posts: number;
      engagement: number;
      impressions: number;
    }
  >();
  for (const post of posts) {
    if (!inWindow(post.postedAt, params, 90, now)) {
      continue;
    }
    const { weekday, hour } = localParts(post.postedAt, timeZone);
    const key = `${weekday}:${hour}`;
    const slot = slots.get(key) ?? {
      weekday,
      hour,
      posts: 0,
      engagement: 0,
      impressions: 0,
    };
    slot.posts += 1;
    slot.engagement += engagementOf(post);
    slot.impressions += post.impressions;
    slots.set(key, slot);
  }
  return [...slots.values()]
    .toSorted((a, b) => a.weekday - b.weekday || a.hour - b.hour)
    .map((slot) => ({
      ...slot,
      avg_engagement: Math.round((slot.engagement / slot.posts) * 10) / 10,
    }));
}

function followerGrowth(
  { accounts }: DemoSocialData,
  params: DemoSocialParams,
  now: Date
) {
  const timeZone = params.timezone || DEFAULT_TIME_ZONE;
  const today = Math.floor(now.getTime() / DAY_MS);
  const rows: {
    day: string;
    provider: string;
    provider_account_id: string;
    followers_count: number;
  }[] = [];
  for (let day = today - DEMO_SOCIAL_HISTORY_DAYS; day <= today; day += 1) {
    const capturedAt = new Date(
      day * DAY_MS + FOLLOWER_SNAPSHOT_HOUR * HOUR_MS
    );
    if (capturedAt > now || !inWindow(capturedAt, params, 30, now)) {
      continue;
    }
    const localDay = localParts(capturedAt, timeZone).day;
    for (const account of accounts) {
      rows.push({
        day: localDay,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        followers_count: demoSocialFollowers(account, capturedAt, now),
      });
    }
  }
  return rows;
}

function notraAdoption({ posts }: DemoSocialData) {
  const viaNotra = posts.filter((post) => post.viaNotra);
  const first = viaNotra.reduce<Date | null>(
    (earliest, post) =>
      earliest === null || post.postedAt < earliest ? post.postedAt : earliest,
    null
  );
  return [
    {
      first_notra_post_at: first ? toClickHouseDateTime(first) : null,
      notra_posts: viaNotra.length,
    },
  ];
}

function postMetricsLookup(
  { posts }: DemoSocialData,
  params: DemoSocialParams,
  now: Date
) {
  const ids = new Set(params.post_ids ?? []);
  return posts
    .filter((post) => ids.has(post.platformPostId))
    .map((post) => ({
      ...postRow(post),
      first_posted_at: toClickHouseDateTime(post.postedAt),
      last_captured_at: toClickHouseDateTime(now),
    }));
}

const DEMO_SOCIAL_PIPES: Record<
  string,
  (data: DemoSocialData, params: DemoSocialParams, now: Date) => unknown[]
> = {
  social_overview: overview,
  engagement_timeseries: engagementTimeseries,
  account_leaderboard: leaderboard,
  top_posts: topPosts,
  posting_performance: postingPerformance,
  follower_growth: followerGrowth,
  notra_adoption: notraAdoption,
  post_metrics_lookup: postMetricsLookup,
};

export function isDemoSocialPipe(pipe: string): boolean {
  return pipe in DEMO_SOCIAL_PIPES;
}

function toDemoSocialParams(params: Record<string, unknown>): DemoSocialParams {
  const postIds = params.post_ids;
  return {
    organization_id: readString(params, "organization_id") ?? "",
    days: readNumber(params, "days"),
    timezone: readString(params, "timezone"),
    date_from: readString(params, "date_from"),
    date_to: readString(params, "date_to"),
    limit: readNumber(params, "limit"),
    post_ids: Array.isArray(postIds)
      ? postIds.filter((id): id is string => typeof id === "string")
      : undefined,
  };
}

/**
 * Answers a social pipe from generated data. The row type is the pipe's
 * declared output, which the mirrors above build field for field.
 */
export async function queryDemoSocialPipe<TRow>(
  pipe: string,
  params: Record<string, unknown>
): Promise<QueryResult<TRow> | null> {
  const handler = DEMO_SOCIAL_PIPES[pipe];
  const provider = (globalThis as ProviderHolder)[PROVIDER_KEY];
  if (!handler || !provider) {
    return null;
  }
  const parsed = toDemoSocialParams(params);
  const now = new Date();
  const accounts = await provider(parsed.organization_id);
  const posts = accounts.flatMap((account) => postsForAccount(account, now));
  const data = handler({ accounts, posts }, parsed, now) as TRow[];
  return {
    data,
    meta: [],
    rows: data.length,
    statistics: { elapsed: 0, rows_read: data.length, bytes_read: 0 },
  };
}
