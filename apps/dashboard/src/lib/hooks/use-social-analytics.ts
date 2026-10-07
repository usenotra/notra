"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

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
  const tToast = useTranslations("analytics.toasts");
  return useQuery<SocialOverviewResponse>({
    ...dashboardOrpc.analytics.overview.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadAnalyticsOverviewFailed") },
  });
}

export function useEngagementTimeseries(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  const tToast = useTranslations("analytics.toasts");
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
    meta: { errorMessage: tToast("loadEngagementDataFailed") },
  });
}

export function useTopPosts(
  organizationId: string,
  limit?: number,
  range?: AnalyticsDateRange
) {
  const tToast = useTranslations("analytics.toasts");
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
    meta: { errorMessage: tToast("loadTopPostsFailed") },
  });
}

export function useFollowerGrowth(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  const tToast = useTranslations("analytics.toasts");
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
    meta: { errorMessage: tToast("loadFollowerGrowthFailed") },
  });
}

const DEFAULT_PERFORMANCE_DAYS = 90;

export function usePostingPerformance(
  organizationId: string,
  range?: AnalyticsDateRange
) {
  const tToast = useTranslations("analytics.toasts");
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
    meta: { errorMessage: tToast("loadPostingPerformanceFailed") },
  });
}

export function useLeaderboard(
  organizationId: string,
  days: LeaderboardWindow
) {
  const tToast = useTranslations("analytics.toasts");
  return useQuery<LeaderboardResponse>({
    ...dashboardOrpc.analytics.leaderboard.queryOptions({
      input: { organizationId, days },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadLeaderboardFailed") },
  });
}

export function useLeaderboardRange(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const tToast = useTranslations("analytics.toasts");
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
    meta: { errorMessage: tToast("loadLeaderboardFailed") },
  });
}

export function useUntrackAccount(organizationId: string) {
  const tToast = useTranslations("analytics.toasts");
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
          : tToast("stopTrackingAccountFailed")
      );
    },
  });
}

export function useNotraAdoption(organizationId: string) {
  const tToast = useTranslations("analytics.toasts");
  return useQuery<NotraAdoptionResponse>({
    ...dashboardOrpc.analytics.adoption.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadAdoptionDataFailed") },
  });
}
