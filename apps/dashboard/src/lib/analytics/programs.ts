import { logError } from "@notra/ai/utils/server-log";
import {
  ingestSocialAccountStats,
  ingestSocialAccounts,
  ingestSocialPostStats,
  ingestSocialPosts,
  isTinybirdConfigured,
  queryAccountLeaderboard,
  queryEngagementTimeseries,
  queryFollowerGrowth,
  queryNotraAdoption,
  queryPostingPerformance,
  querySocialOverview,
  queryTopPosts,
} from "@notra/analytics/tinybird/client";
import { purgeSocialAccountData } from "@notra/analytics/tinybird/purge";
import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  organizations,
  posts,
  trackedSocialAccounts,
} from "@notra/db/schema";
import { isDemoMode } from "@notra/utils/demo-mode";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  analyticsDb,
  analyticsQuery,
  analyticsRequest,
  analyticsSideEffect,
} from "@/lib/analytics/effect";
import {
  AnalyticsAccountNotFoundError,
  TrackedAccountNotFoundError,
} from "@/lib/analytics/errors";
import { buildLeaderboardEntries } from "@/lib/analytics/leaderboard";
import { buildAccountRow } from "@/lib/analytics/rows";
import { resolveTwitterAccount } from "@/lib/analytics/tracked-accounts";
import { collectTwitterRows } from "@/lib/analytics/twitter-sync";
import type {
  AnalyticsRangeOptions,
  EngagementTimeseriesResponse,
  FollowerGrowthResponse,
  LeaderboardAccount,
  LeaderboardResponse,
  LeaderboardWindow,
  NotraAdoptionResponse,
  PostingPerformanceResponse,
  SocialOverviewAccount,
  SocialOverviewResponse,
  SyncableSocialAccount,
  TopPostsResponse,
  TrackAccountPreviewResponse,
} from "@/types/analytics";

function toNullableNumber(value: number | bigint | null): number | null {
  if (value === null) {
    return null;
  }
  return Number(value);
}

const syncTrackedAccountNow = Effect.fn("analytics.syncTrackedAccount")(
  function* (account: SyncableSocialAccount) {
    // Demo stats are generated at read time; there is nothing to sync.
    if (isDemoMode()) {
      return;
    }
    const capturedAt = new Date();
    yield* analyticsRequest("account ingest failed", () =>
      ingestSocialAccounts([buildAccountRow(account, capturedAt)])
    );
    const rows = yield* analyticsRequest("account sync failed", () =>
      collectTwitterRows([account], capturedAt)
    );
    yield* analyticsRequest("account stats ingest failed", () =>
      ingestSocialAccountStats(rows.accountStats)
    );
    yield* analyticsRequest("posts ingest failed", () =>
      ingestSocialPosts(rows.posts)
    );
    yield* analyticsRequest("post stats ingest failed", () =>
      ingestSocialPostStats(rows.postStats)
    );
  }
);

export const loadSocialOverview = Effect.fn("analytics.overview")(function* (
  organizationId: string
) {
  const accounts = yield* analyticsDb("accounts lookup failed", () =>
    db.query.connectedSocialAccounts.findMany({
      columns: {
        id: true,
        provider: true,
        providerAccountId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        verified: true,
      },
      where: eq(connectedSocialAccounts.organizationId, organizationId),
    })
  );

  const configured = isTinybirdConfigured();
  const result = configured
    ? yield* analyticsQuery("overview query failed", () =>
        querySocialOverview({ organization_id: organizationId })
      )
    : null;

  const statsByAccount = new Map(
    (result?.data ?? []).map((row) => [
      `${row.provider}:${row.provider_account_id}`,
      row,
    ])
  );

  const overviewAccounts: SocialOverviewAccount[] = accounts.map((account) => {
    const stats = statsByAccount.get(
      `${account.provider}:${account.providerAccountId}`
    );
    return {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      verified: account.verified ?? false,
      followersCount: toNullableNumber(stats?.followers_count ?? null),
      followingCount: toNullableNumber(stats?.following_count ?? null),
      postsCount: toNullableNumber(stats?.posts_count ?? null),
      trackedPosts: toNullableNumber(stats?.tracked_posts ?? null),
      impressions: toNullableNumber(stats?.impressions ?? null),
      likes: toNullableNumber(stats?.likes ?? null),
      replies: toNullableNumber(stats?.replies ?? null),
      reposts: toNullableNumber(stats?.reposts ?? null),
      quotes: toNullableNumber(stats?.quotes ?? null),
      bookmarks: toNullableNumber(stats?.bookmarks ?? null),
      statsCapturedAt: stats?.stats_captured_at ?? null,
    };
  });

  const response: SocialOverviewResponse = {
    configured,
    accounts: overviewAccounts,
  };
  return response;
});

export const loadEngagementTimeseries = Effect.fn(
  "analytics.engagementTimeseries"
)(function* (organizationId: string, range: AnalyticsRangeOptions) {
  const result = yield* analyticsQuery("query failed", () =>
    queryEngagementTimeseries({
      organization_id: organizationId,
      days: range.days,
      timezone: range.timezone,
      date_from: range.dateFrom,
      date_to: range.dateTo,
    })
  );

  const response: EngagementTimeseriesResponse = {
    configured: isTinybirdConfigured(),
    points: (result?.data ?? []).map((row) => ({
      day: row.day,
      provider: row.provider,
      providerAccountId: row.provider_account_id,
      posts: Number(row.posts),
      impressions: toNullableNumber(row.impressions),
      likes: toNullableNumber(row.likes),
      replies: toNullableNumber(row.replies),
      reposts: toNullableNumber(row.reposts),
    })),
  };
  return response;
});

export const loadTopPosts = Effect.fn("analytics.topPosts")(function* (
  organizationId: string,
  limit: number | undefined,
  range: AnalyticsRangeOptions
) {
  const [result, accounts, tracked] = yield* Effect.all(
    [
      analyticsQuery("top posts query failed", () =>
        queryTopPosts({
          organization_id: organizationId,
          limit,
          timezone: range.timezone,
          date_from: range.dateFrom,
          date_to: range.dateTo,
        })
      ),
      analyticsDb("accounts lookup failed", () =>
        db.query.connectedSocialAccounts.findMany({
          columns: {
            provider: true,
            providerAccountId: true,
            username: true,
            profileImageUrl: true,
          },
          where: eq(connectedSocialAccounts.organizationId, organizationId),
        })
      ),
      analyticsDb("tracked accounts lookup failed", () =>
        db.query.trackedSocialAccounts.findMany({
          columns: {
            provider: true,
            providerAccountId: true,
            username: true,
            profileImageUrl: true,
          },
          where: eq(trackedSocialAccounts.organizationId, organizationId),
        })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const accountsByKey = new Map(
    [...accounts, ...tracked].map((account) => [
      `${account.provider}:${account.providerAccountId}`,
      account,
    ])
  );

  const response: TopPostsResponse = {
    configured: isTinybirdConfigured(),
    posts: (result?.data ?? [])
      .filter((row) =>
        accountsByKey.has(`${row.provider}:${row.provider_account_id}`)
      )
      .map((row) => {
        const account = accountsByKey.get(
          `${row.provider}:${row.provider_account_id}`
        );
        return {
          provider: row.provider,
          platformPostId: row.platform_post_id,
          providerAccountId: row.provider_account_id,
          username: account?.username ?? null,
          profileImageUrl: account?.profileImageUrl ?? null,
          content: row.content,
          url: row.url,
          postedAt: row.posted_at,
          impressions: toNullableNumber(row.impressions),
          likes: toNullableNumber(row.likes),
          replies: toNullableNumber(row.replies),
          reposts: toNullableNumber(row.reposts),
          bookmarks: toNullableNumber(row.bookmarks),
          engagement: Number(row.engagement),
        };
      }),
  };
  return response;
});

export const loadNotraAdoption = Effect.fn("analytics.adoption")(function* (
  organizationId: string
) {
  const [organization, firstPublishedPost, adoptionResult] = yield* Effect.all(
    [
      analyticsDb("organization lookup failed", () =>
        db.query.organizations.findFirst({
          columns: { createdAt: true },
          where: eq(organizations.id, organizationId),
        })
      ),
      analyticsDb("first post lookup failed", () =>
        db.query.posts.findFirst({
          columns: { createdAt: true },
          where: and(
            eq(posts.organizationId, organizationId),
            eq(posts.status, "published")
          ),
          orderBy: [asc(posts.createdAt)],
        })
      ),
      analyticsQuery("adoption query failed", () =>
        queryNotraAdoption({ organization_id: organizationId })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const adoptionRow = adoptionResult?.data.at(0);
  const trackedFirstPost = adoptionRow?.first_notra_post_at ?? null;

  const response: NotraAdoptionResponse = {
    configured: isTinybirdConfigured(),
    organizationCreatedAt: organization?.createdAt.toISOString() ?? null,
    firstNotraPostAt:
      trackedFirstPost ?? firstPublishedPost?.createdAt.toISOString() ?? null,
    notraPosts: Number(adoptionRow?.notra_posts ?? 0),
  };
  return response;
});

export const loadPostingPerformance = Effect.fn("analytics.postingPerformance")(
  function* (organizationId: string, range: AnalyticsRangeOptions) {
    const result = yield* analyticsQuery(
      "posting performance query failed",
      () =>
        queryPostingPerformance({
          organization_id: organizationId,
          days: range.days,
          timezone: range.timezone,
          date_from: range.dateFrom,
          date_to: range.dateTo,
        })
    );

    const response: PostingPerformanceResponse = {
      configured: isTinybirdConfigured(),
      points: (result?.data ?? []).map((row) => ({
        weekday: Number(row.weekday),
        hour: Number(row.hour),
        posts: Number(row.posts),
        engagement: Number(row.engagement),
        impressions: toNullableNumber(row.impressions),
        avgEngagement: Number(row.avg_engagement),
      })),
    };
    return response;
  }
);

export const loadLeaderboard = Effect.fn("analytics.leaderboard")(function* (
  organizationId: string,
  days: LeaderboardWindow,
  range: AnalyticsRangeOptions
) {
  const [connected, tracked, result] = yield* Effect.all(
    [
      analyticsDb("accounts lookup failed", () =>
        db.query.connectedSocialAccounts.findMany({
          columns: {
            provider: true,
            providerAccountId: true,
            username: true,
            displayName: true,
            profileImageUrl: true,
            verified: true,
            verifiedType: true,
          },
          where: eq(connectedSocialAccounts.organizationId, organizationId),
        })
      ),
      analyticsDb("tracked accounts lookup failed", () =>
        db.query.trackedSocialAccounts.findMany({
          columns: {
            id: true,
            provider: true,
            providerAccountId: true,
            username: true,
            displayName: true,
            profileImageUrl: true,
            verified: true,
            verifiedType: true,
          },
          where: eq(trackedSocialAccounts.organizationId, organizationId),
        })
      ),
      analyticsQuery("leaderboard query failed", () =>
        queryAccountLeaderboard({
          organization_id: organizationId,
          days,
          timezone: range.timezone,
          date_from: range.dateFrom,
          date_to: range.dateTo,
        })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const connectedKeys = new Set(
    connected.flatMap((account) => [
      `${account.provider}:${account.providerAccountId}`,
      `${account.provider}:@${account.username.toLowerCase()}`,
    ])
  );

  const accounts: LeaderboardAccount[] = [
    ...connected.map((account) => ({
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      verified: account.verified ?? false,
      verifiedType: account.verifiedType,
      isConnected: true,
      trackedAccountId: null,
    })),
    ...tracked
      .filter(
        (account) =>
          !(
            connectedKeys.has(
              `${account.provider}:${account.providerAccountId}`
            ) ||
            connectedKeys.has(
              `${account.provider}:@${account.username.toLowerCase()}`
            )
          )
      )
      .map((account) => ({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        username: account.username,
        displayName: account.displayName,
        profileImageUrl: account.profileImageUrl,
        verified: account.verified,
        verifiedType: account.verifiedType,
        isConnected: false,
        trackedAccountId: account.id,
      })),
  ];

  const totals = (result?.data ?? []).map((row) => ({
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    posts: Number(row.posts),
    interactions: Number(row.interactions),
    impressions: Number(row.impressions),
    previousPosts: Number(row.prev_posts),
    previousInteractions: Number(row.prev_interactions),
    previousImpressions: Number(row.prev_impressions),
  }));

  const response: LeaderboardResponse = {
    configured: isTinybirdConfigured(),
    days,
    entries: buildLeaderboardEntries(accounts, totals),
  };
  return response;
});

export const previewTrackedAccount = Effect.fn("analytics.previewAccount")(
  function* (username: string) {
    const account = yield* analyticsQuery("account preview failed", () =>
      resolveTwitterAccount(username)
    );

    const response: TrackAccountPreviewResponse = {
      account: account ?? null,
    };
    return response;
  }
);

export const trackTwitterAccount = Effect.fn("analytics.trackAccount")(
  function* (organizationId: string, username: string) {
    const resolved = yield* analyticsRequest("account resolve failed", () =>
      resolveTwitterAccount(username)
    );
    if (!resolved) {
      return yield* Effect.fail(
        new AnalyticsAccountNotFoundError({ username })
      );
    }

    const connectedTwitterAccounts = yield* analyticsDb(
      "accounts lookup failed",
      () =>
        db.query.connectedSocialAccounts.findMany({
          columns: { providerAccountId: true, username: true },
          where: and(
            eq(connectedSocialAccounts.organizationId, organizationId),
            eq(connectedSocialAccounts.provider, "twitter")
          ),
        })
    );
    const existingConnected = connectedTwitterAccounts.some(
      (account) =>
        account.providerAccountId === resolved.providerAccountId ||
        account.username.toLowerCase() === resolved.username.toLowerCase()
    );
    if (existingConnected) {
      return { trackedAccountId: null, username: resolved.username };
    }

    const existingTracked = yield* analyticsDb(
      "tracked account lookup failed",
      () =>
        db.query.trackedSocialAccounts.findFirst({
          columns: { id: true },
          where: and(
            eq(trackedSocialAccounts.organizationId, organizationId),
            eq(trackedSocialAccounts.provider, "twitter"),
            eq(
              trackedSocialAccounts.providerAccountId,
              resolved.providerAccountId
            )
          ),
        })
    );
    if (existingTracked) {
      return {
        trackedAccountId: existingTracked.id,
        username: resolved.username,
      };
    }

    const trackedAccountId = crypto.randomUUID();
    yield* analyticsDb("tracked account insert failed", () =>
      db.insert(trackedSocialAccounts).values({
        id: trackedAccountId,
        organizationId,
        provider: "twitter",
        providerAccountId: resolved.providerAccountId,
        username: resolved.username,
        displayName: resolved.displayName,
        profileImageUrl: resolved.profileImageUrl,
        verified: resolved.verified,
        verifiedType: resolved.verifiedType,
      })
    );

    yield* syncTrackedAccountNow({
      id: trackedAccountId,
      organizationId,
      provider: "twitter",
      providerAccountId: resolved.providerAccountId,
      username: resolved.username,
      displayName: resolved.displayName,
      profileImageUrl: resolved.profileImageUrl,
      verified: false,
    }).pipe(
      Effect.catch((error) => {
        logError("[Analytics] tracked account sync failed", error.cause);
        return Effect.succeed(undefined);
      })
    );

    return { trackedAccountId, username: resolved.username };
  }
);

export const untrackTwitterAccount = Effect.fn("analytics.untrackAccount")(
  function* (organizationId: string, trackedAccountId: string) {
    const deleted = yield* analyticsDb("tracked account delete failed", () =>
      db
        .delete(trackedSocialAccounts)
        .where(
          and(
            eq(trackedSocialAccounts.id, trackedAccountId),
            eq(trackedSocialAccounts.organizationId, organizationId)
          )
        )
        .returning({
          id: trackedSocialAccounts.id,
          provider: trackedSocialAccounts.provider,
          providerAccountId: trackedSocialAccounts.providerAccountId,
        })
    );

    const removed = deleted.at(0);
    if (!removed) {
      return yield* Effect.fail(
        new TrackedAccountNotFoundError({ trackedAccountId })
      );
    }

    yield* analyticsSideEffect("account purge failed", () =>
      purgeSocialAccountData({
        organizationId,
        provider: removed.provider,
        providerAccountId: removed.providerAccountId,
      })
    );

    return { trackedAccountId };
  }
);

export const loadFollowerGrowth = Effect.fn("analytics.followerGrowth")(
  function* (organizationId: string, range: AnalyticsRangeOptions) {
    const result = yield* analyticsQuery("follower growth query failed", () =>
      queryFollowerGrowth({
        organization_id: organizationId,
        days: range.days,
        timezone: range.timezone,
        date_from: range.dateFrom,
        date_to: range.dateTo,
      })
    );

    const response: FollowerGrowthResponse = {
      configured: isTinybirdConfigured(),
      points: (result?.data ?? []).map((row) => ({
        day: row.day,
        provider: row.provider,
        providerAccountId: row.provider_account_id,
        followersCount: toNullableNumber(row.followers_count),
      })),
    };
    return response;
  }
);
