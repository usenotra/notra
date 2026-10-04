"use client";

import { Linkedin02Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  ACCOUNT_DETAIL_MIN_POINTS,
  ACCOUNT_DETAIL_POSTS_LIMIT,
  ACCOUNT_DETAIL_SERIES_KEY,
  ACCOUNT_DETAIL_WINDOW,
  ACCOUNT_POSTS_PAGE_TABLE_HEIGHT,
  ACCOUNT_POSTS_TABLE_HEIGHT,
  ANALYTICS_TIMESERIES_DAYS,
} from "@/constants/analytics";
import { CHART_PRIMARY_COLOR } from "@/constants/charts";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useDayLabel } from "@/lib/hooks/use-day-label";
import { useFormatMetric } from "@/lib/hooks/use-format-metric";
import {
  useEngagementTimeseries,
  useLeaderboard,
  useSocialOverview,
  useTopPosts,
} from "@/lib/hooks/use-social-analytics";
import { cn } from "@/lib/utils";
import type {
  AccountDetailViewProps,
  AccountIdentity,
  LeaderboardDetailMetric,
  TopPostItem,
} from "@/types/analytics";
import type { ChartConfig } from "@/types/charts";
import {
  buildAccountEngagementPoints,
  buildAccountIdentity,
  findLeaderboardEntry,
  findOverviewAccount,
  postsForAccount,
} from "@/utils/analytics-accounts";
import {
  leaderboardDetailMetrics,
  previewPostContent,
} from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { isSquareTwitterAvatar } from "@/utils/twitter";

/** Columns for an account's top posts, newest metrics on the right. */
function useTopPostColumns(): TableColumn<TopPostItem>[] {
  const tAnalyticsShared = useTranslations("analytics.shared");
  const tCommon = useTranslations("common");
  const formatMetric = useFormatMetric();
  const formatDayLabel = useDayLabel();
  return useMemo<TableColumn<TopPostItem>[]>(
    () => [
      {
        key: "content",
        header: tCommon("labels.post"),
        width: "2.6fr",
        cell: (row) => (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="block w-full min-w-0 truncate text-sm leading-snug">
                  {previewPostContent(row.content)}
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{row.content}</TooltipContent>
          </Tooltip>
        ),
      },
      {
        key: "postedAt",
        header: tAnalyticsShared("posted"),
        width: "7.5rem",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-[0.6875rem] whitespace-nowrap tabular-nums">
            {formatDayLabel(row.postedAt.slice(0, 10))}
          </span>
        ),
      },
      {
        key: "likes",
        header: tAnalyticsShared("likes"),
        width: "5.625rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-sm tabular-nums">
            {formatMetric(row.likes)}
          </span>
        ),
        sortValue: (row) => row.likes ?? 0,
      },
      {
        key: "replies",
        header: tAnalyticsShared("replies"),
        width: "5.625rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-sm tabular-nums">
            {formatMetric(row.replies)}
          </span>
        ),
        sortValue: (row) => row.replies ?? 0,
      },
      {
        key: "impressions",
        header: tCommon("labels.impressions"),
        width: "6.875rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {row.impressions === null ? "-" : formatMetric(row.impressions)}
          </span>
        ),
        sortValue: (row) => row.impressions ?? 0,
      },
      {
        key: "engagement",
        header: tAnalyticsShared("engagement"),
        width: "7.5rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-sm tabular-nums">
            {formatMetric(row.engagement)}
          </span>
        ),
      },
    ],
    [tAnalyticsShared, tCommon, formatDayLabel, formatMetric]
  );
}

/** Avatar, name, handle and follower count at the top of the account view. */
function AccountHeader({
  handle,
  identity,
}: {
  handle: string;
  identity: AccountIdentity | null;
}) {
  const tAnalyticsShared = useTranslations("analytics.shared");
  const formatMetric = useFormatMetric();
  const displayName = identity?.displayName ?? identity?.username ?? handle;
  const username = identity?.username ?? handle;
  const providerIcon =
    identity?.provider === "linkedin" ? Linkedin02Icon : NewTwitterIcon;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar
          className={cn(
            "size-10 shrink-0",
            isSquareTwitterAvatar(identity?.verifiedType ?? null) &&
              "rounded-md"
          )}
        >
          {identity?.profileImageUrl && (
            <AvatarImage
              alt={displayName}
              className={cn(
                isSquareTwitterAvatar(identity.verifiedType) && "rounded-md"
              )}
              src={identity.profileImageUrl}
            />
          )}
          <AvatarFallback className="text-xs">
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="flex min-w-0 items-center gap-1.5 text-lg font-semibold">
            <span className="truncate">{displayName}</span>
            <XVerificationBadge
              className="size-4 shrink-0"
              verified={identity?.verified ?? false}
              verifiedType={identity?.verifiedType ?? null}
            />
          </p>
          <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            <HugeiconsIcon icon={providerIcon} size={12} />
            <span className="truncate">@{username}</span>
          </span>
        </div>
      </div>
      <div className="text-right leading-tight">
        <p className="text-lg font-semibold tabular-nums">
          {formatMetric(identity?.followersCount ?? null)}
        </p>
        <p className="text-muted-foreground text-xs">
          {tAnalyticsShared("followers")}
        </p>
      </div>
    </div>
  );
}

export function AccountDetailView({
  organizationSlug,
  handle,
  variant = "modal",
}: AccountDetailViewProps) {
  const t = useTranslations("analytics.accountDetail");
  const tAnalyticsShared = useTranslations("analytics.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const tSummary = useTranslations("analytics.summary");
  const metricLabels: Record<LeaderboardDetailMetric["labelKey"], string> = {
    followers: tAnalyticsShared("followers"),
    impressions: tCommon("labels.impressions"),
    likes: tAnalyticsShared("likes"),
    replies: tAnalyticsShared("replies"),
    reposts: t("metrics.reposts"),
    quotes: t("metrics.quotes"),
    bookmarks: t("metrics.bookmarks"),
    engagementRate: t("metrics.engagementRate"),
  };
  const format = useFormatter();
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      [ACCOUNT_DETAIL_SERIES_KEY]: {
        label: tAnalyticsShared("engagement"),
        colors: seriesColors(CHART_PRIMARY_COLOR),
      },
    }),
    [t]
  );
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data: overview, isLoading: isOverviewLoading } =
    useSocialOverview(organizationId);
  const { data: leaderboard } = useLeaderboard(
    organizationId,
    ACCOUNT_DETAIL_WINDOW
  );
  const { data: engagement, isLoading: isEngagementLoading } =
    useEngagementTimeseries(organizationId);
  const { data: topPosts, isLoading: isPostsLoading } = useTopPosts(
    organizationId,
    ACCOUNT_DETAIL_POSTS_LIMIT
  );

  const account = useMemo(
    () => findOverviewAccount(overview?.accounts ?? [], handle),
    [overview?.accounts, handle]
  );
  const entry = useMemo(
    () => findLeaderboardEntry(leaderboard?.entries ?? [], handle),
    [leaderboard?.entries, handle]
  );
  const identity = useMemo(
    () => buildAccountIdentity(account, entry),
    [account, entry]
  );

  const points = useMemo(
    () =>
      buildAccountEngagementPoints(engagement?.points ?? [], identity, locale),
    [engagement?.points, identity, locale]
  );

  const posts = useMemo(
    () => postsForAccount(topPosts?.posts ?? [], identity),
    [topPosts?.posts, identity]
  );

  const metrics = useMemo(
    () =>
      account
        ? leaderboardDetailMetrics(account, locale, tCommon("labels.nA"))
        : [],
    [account, locale, tSummary]
  );

  const columns = useTopPostColumns();
  const username = identity?.username ?? handle;

  return (
    <div className="space-y-5">
      <AccountHeader handle={handle} identity={identity} />

      {isOverviewLoading && <Skeleton className="h-14 w-full rounded-2xl" />}
      {!isOverviewLoading && metrics.length > 0 && (
        <dl className="bg-border grid grid-cols-4 gap-px overflow-hidden rounded-2xl sm:grid-cols-8">
          {metrics.map((metric) => (
            <div className="bg-muted/40 px-2 py-1.5" key={metric.labelKey}>
              <dt className="text-muted-foreground text-xs first-letter:uppercase">
                {metricLabels[metric.labelKey]}
              </dt>
              <dd className="font-mono text-sm tabular-nums">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-2">
        <h2 className="text-base font-semibold">{t("overTime")}</h2>
        {isEngagementLoading && <Skeleton className="h-52 w-full" />}
        {!isEngagementLoading && points.length >= ACCOUNT_DETAIL_MIN_POINTS && (
          <EChartsAreaChart
            className="h-52 w-full"
            config={chartConfig}
            curveType="monotone"
            data={points}
            enableHoverHighlight
            xDataKey="day"
          >
            <EChartsAreaChart.Grid />
            <EChartsAreaChart.XAxis dataKey="day" />
            <EChartsAreaChart.YAxis />
            <EChartsAreaChart.Area
              dataKey={ACCOUNT_DETAIL_SERIES_KEY}
              variant="gradient"
            />
            <EChartsAreaChart.Tooltip crosshair />
          </EChartsAreaChart>
        )}
        {!isEngagementLoading && points.length < ACCOUNT_DETAIL_MIN_POINTS && (
          <p className="text-muted-foreground text-sm wrap-anywhere">
            {t("notEnoughActivity", {
              days: ANALYTICS_TIMESERIES_DAYS,
              handle: username,
            })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{t("recentPosts")}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("postCount", {
              count: posts.length,
              formatted: format.number(posts.length),
            })}
          </span>
        </div>
        <DataTable
          columns={columns}
          data={posts}
          defaultSort={{ key: "postedAt", direction: "desc" }}
          emptyState={t("noPosts", { handle: username })}
          getRowId={(row) => `${row.provider}:${row.platformPostId}`}
          height={
            variant === "page"
              ? ACCOUNT_POSTS_PAGE_TABLE_HEIGHT
              : ACCOUNT_POSTS_TABLE_HEIGHT
          }
          loading={isPostsLoading}
          onRowClick={(row) => {
            if (row.url) {
              window.open(row.url, "_blank", "noopener,noreferrer");
            }
          }}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
        />
      </div>
    </div>
  );
}
