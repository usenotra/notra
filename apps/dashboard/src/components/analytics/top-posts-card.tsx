"use client";

import { Linkedin02Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@notra/ui/components/instrument/instrument-module";
import { DelayedTooltip } from "@notra/ui/components/shared/delayed-tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { ANALYTICS_TOOLTIP_DELAY_MS } from "@/constants/analytics";
import { TABLE_ROW_HEIGHT, TABLE_SKELETON_ROWS } from "@/constants/table";
import { useDayLabel } from "@/lib/hooks/use-day-label";
import { useFormatMetric } from "@/lib/hooks/use-format-metric";
import type { TopPostItem, TopPostsCardProps } from "@/types/analytics";
import { previewPostContent } from "@/utils/analytics-charts";
import { tableHeightFor } from "@/utils/table";

function PostAvatar({ post }: { post: TopPostItem }) {
  const name = post.username ?? post.providerAccountId;
  return (
    <Avatar className="size-7 shrink-0">
      {post.profileImageUrl && (
        <AvatarImage alt={name} src={post.profileImageUrl} />
      )}
      <AvatarFallback className="text-[0.625rem]">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function TopPostsCard({
  posts,
  action,
  isPending = false,
}: TopPostsCardProps) {
  const t = useTranslations("analytics.topPosts");
  const tCommon = useTranslations("common");
  const tAnalyticsShared = useTranslations("analytics.shared");
  const formatMetric = useFormatMetric();
  const format = useFormatter();
  const formatDayLabel = useDayLabel();
  const columns = useMemo<TableColumn<TopPostItem>[]>(
    () => [
      {
        key: "account",
        header: tCommon("labels.account"),
        width: "7rem",
        sortable: true,
        cell: (row) => (
          <DelayedTooltip delay={ANALYTICS_TOOLTIP_DELAY_MS}>
            <TooltipTrigger
              render={<span className="flex items-center gap-2" />}
            >
              <PostAvatar post={row} />
              <HugeiconsIcon
                className="text-muted-foreground"
                icon={
                  row.provider === "linkedin" ? Linkedin02Icon : NewTwitterIcon
                }
                size={12}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">
                {row.username ? `@${row.username}` : "-"}
              </p>
            </TooltipContent>
          </DelayedTooltip>
        ),
        sortValue: (row) => row.username ?? row.providerAccountId,
      },
      {
        key: "content",
        header:
          posts.length > 0
            ? t("postCount", { count: format.number(posts.length) })
            : tCommon("labels.post"),
        width: "2.6fr",
        cell: (row) => (
          <DelayedTooltip delay={ANALYTICS_TOOLTIP_DELAY_MS}>
            <TooltipTrigger
              render={
                <span className="block w-full min-w-0 truncate text-left text-sm leading-snug" />
              }
            >
              {previewPostContent(row.content)}
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-xs leading-snug">{row.content}</p>
            </TooltipContent>
          </DelayedTooltip>
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
        key: "impressions",
        header: tCommon("labels.impressions"),
        width: "8.5rem",
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
        width: "9rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-sm tabular-nums">
            {formatMetric(row.engagement)}
          </span>
        ),
      },
    ],
    [posts.length, t, format, formatDayLabel, formatMetric]
  );

  return (
    <InstrumentModule
      action={action}
      bareBody
      eyebrow={t("title")}
      variant="panel"
    >
      {posts.length === 0 && !isPending ? (
        <InstrumentEmpty
          className="h-40"
          message={tAnalyticsShared("noPostsForThisTime")}
          seed="Top posts"
        />
      ) : (
        <DataTable
          columns={columns}
          data={posts}
          defaultSort={{ key: "engagement", direction: "desc" }}
          emptyState={tAnalyticsShared("noPostsForThisTime")}
          getRowId={(row) => `${row.provider}:${row.platformPostId}`}
          height={tableHeightFor(
            isPending ? TABLE_SKELETON_ROWS : posts.length
          )}
          loading={isPending}
          onRowClick={(row) => {
            if (row.url) {
              window.open(row.url, "_blank", "noopener,noreferrer");
            }
          }}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
        />
      )}
    </InstrumentModule>
  );
}
