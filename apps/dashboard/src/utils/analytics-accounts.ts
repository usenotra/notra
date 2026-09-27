import { formatDayLabel } from "@notra/geo-core/utils/day-label";

import type {
  AccountEngagementPoint,
  AccountIdentity,
  AnalyticsProviderFilter,
  EngagementTimeseriesPoint,
  LeaderboardEntry,
  SocialOverviewAccount,
  TopPostItem,
} from "@/types/analytics";
import { bestFuzzyScore, fuzzyMatches } from "@/utils/fuzzy";

function searchableFields(entry: LeaderboardEntry): string[] {
  return [entry.username, entry.displayName ?? ""];
}

export function filterLeaderboardEntries(
  entries: readonly LeaderboardEntry[],
  search: string,
  provider: AnalyticsProviderFilter
): LeaderboardEntry[] {
  const query = search.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    if (provider !== "all" && entry.provider !== provider) {
      return false;
    }
    return fuzzyMatches(searchableFields(entry), query);
  });

  if (query.length === 0) {
    return filtered;
  }

  return filtered
    .map((entry) => ({
      entry,
      score: bestFuzzyScore(searchableFields(entry), query),
    }))
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.entry);
}

export function toProviderFilter(value: string): AnalyticsProviderFilter {
  if (value === "twitter" || value === "linkedin") {
    return value;
  }
  return "all";
}

export function normalizeHandle(handle: string): string {
  return handle.trim().replace("@", "").toLowerCase();
}

export function findOverviewAccount(
  accounts: readonly SocialOverviewAccount[],
  handle: string
): SocialOverviewAccount | null {
  const normalized = normalizeHandle(handle);
  return (
    accounts.find((account) => account.username.toLowerCase() === normalized) ??
    null
  );
}

export function findLeaderboardEntry(
  entries: readonly LeaderboardEntry[],
  handle: string
): LeaderboardEntry | null {
  const normalized = normalizeHandle(handle);
  return (
    entries.find((entry) => entry.username.toLowerCase() === normalized) ?? null
  );
}

export function buildAccountIdentity(
  account: SocialOverviewAccount | null,
  entry: LeaderboardEntry | null
): AccountIdentity | null {
  if (account) {
    return {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      verified: account.verified,
      verifiedType: entry?.verifiedType ?? null,
      followersCount: account.followersCount,
    };
  }
  if (entry) {
    return {
      provider: entry.provider,
      providerAccountId: entry.providerAccountId,
      username: entry.username,
      displayName: entry.displayName,
      profileImageUrl: entry.profileImageUrl,
      verified: entry.verified,
      verifiedType: entry.verifiedType,
      followersCount: null,
    };
  }
  return null;
}

export function buildAccountEngagementPoints(
  points: readonly EngagementTimeseriesPoint[],
  identity: AccountIdentity | null,
  locale: string
): AccountEngagementPoint[] {
  if (!identity) {
    return [];
  }
  const totals = new Map<string, number>();
  for (const point of points) {
    if (
      point.provider !== identity.provider ||
      point.providerAccountId !== identity.providerAccountId
    ) {
      continue;
    }
    const engagement =
      (point.likes ?? 0) + (point.replies ?? 0) + (point.reposts ?? 0);
    totals.set(point.day, (totals.get(point.day) ?? 0) + engagement);
  }
  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, engagement]) => ({
      day: formatDayLabel(day, locale),
      engagement,
    }));
}

export function postsForAccount(
  posts: readonly TopPostItem[],
  identity: AccountIdentity | null
): TopPostItem[] {
  if (!identity) {
    return [];
  }
  return posts.filter(
    (post) =>
      post.provider === identity.provider &&
      post.providerAccountId === identity.providerAccountId
  );
}
