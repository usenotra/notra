"use client";

import { Linkedin02Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import { Table, type TableColumn } from "@/components/motion/table";
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
import {
  useEngagementTimeseries,
  useLeaderboard,
  useSocialOverview,
  useTopPosts,
} from "@/lib/hooks/use-social-analytics";
import { cn } from "@/lib/utils";
import type { AccountDetailViewProps, TopPostItem } from "@/types/analytics";
import type { ChartConfig } from "@/types/charts";
import {
  buildAccountEngagementPoints,
  buildAccountIdentity,
  findLeaderboardEntry,
  findOverviewAccount,
  postsForAccount,
} from "@/utils/analytics-accounts";
import {
  formatMetric,
  leaderboardDetailMetrics,
  previewPostContent,
} from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { isSquareTwitterAvatar } from "@/utils/twitter";

const CHART_CONFIG: ChartConfig = {
  [ACCOUNT_DETAIL_SERIES_KEY]: {
    label: "Engagement",
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
};

export function AccountDetailView({
  organizationSlug,
  handle,
  variant = "modal",
}: AccountDetailViewProps) {
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
    () => buildAccountEngagementPoints(engagement?.points ?? [], identity),
    [engagement?.points, identity]
  );

  const posts = useMemo(
    () => postsForAccount(topPosts?.posts ?? [], identity),
    [topPosts?.posts, identity]
  );

  const metrics = useMemo(
    () => (account ? leaderboardDetailMetrics(account) : []),
    [account]
  );

  const columns = useMemo<TableColumn<TopPostItem>[]>(
    () => [
      {
        key: "content",
        header: "Post",
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
        header: "Posted",
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
        header: "Likes",
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
        header: "Replies",
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
        header: "Impressions",
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
        header: "Engagement",
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
    []
  );

  const displayName = identity?.displayName ?? identity?.username ?? handle;
  const username = identity?.username ?? handle;
  const providerIcon =
    identity?.provider === "linkedin" ? Linkedin02Icon : NewTwitterIcon;

  return (
    <div className="space-y-5">
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
          <p className="text-muted-foreground text-xs">Followers</p>
        </div>
      </div>

      {isOverviewLoading && <Skeleton className="h-14 w-full rounded-2xl" />}
      {!isOverviewLoading && metrics.length > 0 && (
        <dl className="bg-border grid grid-cols-4 gap-px overflow-hidden rounded-2xl sm:grid-cols-8">
          {metrics.map((metric) => (
            <div className="bg-muted/40 px-2 py-1.5" key={metric.label}>
              <dt className="text-muted-foreground text-xs capitalize">
                {metric.label}
              </dt>
              <dd className="font-mono text-sm tabular-nums">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-2">
        <h2 className="text-base font-semibold">Engagement over time</h2>
        {isEngagementLoading && <Skeleton className="h-52 w-full" />}
        {!isEngagementLoading && points.length >= ACCOUNT_DETAIL_MIN_POINTS && (
          <EChartsAreaChart
            className="h-52 w-full"
            config={CHART_CONFIG}
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
            Not enough activity in the last {ANALYTICS_TIMESERIES_DAYS} days to
            chart @{username}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Recent posts</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {posts.length.toLocaleString()} posts
          </span>
        </div>
        <Table
          className="rounded-2xl"
          columns={columns}
          data={posts}
          defaultSort={{ key: "postedAt", direction: "desc" }}
          emptyState={`No tracked posts for @${username} yet`}
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
