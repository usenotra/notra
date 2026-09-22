"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  AnalyticsDateRange,
  EngagementTimeseriesResponse,
  FollowerGrowthResponse,
  LeaderboardResponse,
  LeaderboardWindow,
  NotraAdoptionResponse,
  PostingPerformanceResponse,
  SocialOverviewResponse,
  TopPostsResponse,
} from "@/types/analytics";

import { dashboardOrpc } from "../orpc/query";

const DEFAULT_TIMESERIES_DAYS = 30;
const DEFAULT_TOP_POSTS_LIMIT = 8;

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useSocialOverview(organizationId: string) {
  return useQuery<SocialOverviewResponse>({
    ...dashboardOrpc.analytics.overview.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load analytics overview" },
  });
}

export function useEngagementTimeseries(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  return useQuery<EngagementTimeseriesResponse>({
    ...dashboardOrpc.analytics.engagementTimeseries.queryOptions({
      input: {
        organizationId,
        days: range ? undefined : DEFAULT_TIMESERIES_DAYS,
        timezone: browserTimezone(),
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
      },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load engagement data" },
  });
}

export function useTopPosts(
  organizationId: string,
  limit?: number,
  range?: AnalyticsDateRange
) {
  return useQuery<TopPostsResponse>({
    ...dashboardOrpc.analytics.topPosts.queryOptions({
      input: {
        organizationId,
        limit: limit ?? DEFAULT_TOP_POSTS_LIMIT,
        timezone: browserTimezone(),
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
      },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load top posts" },
  });
}

export function useFollowerGrowth(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  return useQuery<FollowerGrowthResponse>({
    ...dashboardOrpc.analytics.followerGrowth.queryOptions({
      input: {
        organizationId,
        days: range ? undefined : DEFAULT_TIMESERIES_DAYS,
        timezone: browserTimezone(),
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
      },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load follower growth" },
  });
}

const DEFAULT_PERFORMANCE_DAYS = 90;

export function usePostingPerformance(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  return useQuery<PostingPerformanceResponse>({
    ...dashboardOrpc.analytics.postingPerformance.queryOptions({
      input: {
        organizationId,
        days: range ? undefined : DEFAULT_PERFORMANCE_DAYS,
        timezone: browserTimezone(),
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
      },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load posting performance" },
  });
}

export function useLeaderboard(
  organizationId: string,
  days: LeaderboardWindow
) {
  return useQuery<LeaderboardResponse>({
    ...dashboardOrpc.analytics.leaderboard.queryOptions({
      input: { organizationId, days },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load leaderboard" },
  });
}

export function useLeaderboardRange(
  organizationId: string,
  range: AnalyticsDateRange
) {
  return useQuery<LeaderboardResponse>({
    ...dashboardOrpc.analytics.leaderboard.queryOptions({
      input: {
        organizationId,
        timezone: browserTimezone(),
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load leaderboard" },
  });
}

export function useUntrackAccount(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackedAccountId: string) =>
      dashboardOrpc.analytics.untrackAccount.call({
        organizationId,
        trackedAccountId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.analytics.leaderboard.key(),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Failed to stop tracking account"
      );
    },
  });
}

export function useNotraAdoption(organizationId: string) {
  return useQuery<NotraAdoptionResponse>({
    ...dashboardOrpc.analytics.adoption.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load adoption data" },
  });
}
