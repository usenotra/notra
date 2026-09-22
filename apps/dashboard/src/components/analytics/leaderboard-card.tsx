"use client";

import { Cancel01Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";

import { PlatformTabs } from "@/components/analytics/platform-tabs";
import { ProviderIcon } from "@/components/analytics/provider-icon";
import { AnalyticsRangePicker } from "@/components/analytics/range-picker";
import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  ANALYTICS_PROVIDER_FILTER_VALUES,
  ANALYTICS_PROVIDER_FILTERS,
  LEADERBOARD_EMPTY_HEIGHT,
  LEADERBOARD_PAGE_HEIGHT,
} from "@/constants/analytics";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useAnalyticsRange } from "@/lib/hooks/use-analytics-range";
import {
  useLeaderboardRange,
  useUntrackAccount,
} from "@/lib/hooks/use-social-analytics";
import { cn } from "@/lib/utils";
import type { LeaderboardCardProps, LeaderboardEntry } from "@/types/analytics";
import {
  filterLeaderboardEntries,
  toProviderFilter,
} from "@/utils/analytics-accounts";
import { formatMetric } from "@/utils/analytics-charts";
import { tableHeightFor } from "@/utils/table";
import { isSquareTwitterAvatar } from "@/utils/twitter";

export function LeaderboardCard({
  organizationId,
  organizationSlug,
  variant = "module",
}: LeaderboardCardProps) {
  const router = useRouter();
  const range = useAnalyticsRange("leaderboardRange", "7d");
  const untrack = useUntrackAccount(organizationId);
  const { data, isPending, isPlaceholderData } = useLeaderboardRange(
    organizationId,
    range.range
  );

  const [search, setSearch] = useQueryState(
    "account",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [providerFilter, setProviderFilter] = useQueryState(
    "platform",
    parseAsStringLiteral(ANALYTICS_PROVIDER_FILTER_VALUES)
      .withDefault("all")
      .withOptions({ clearOnDefault: true })
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const entries = useMemo(() => data?.entries ?? [], [data]);

  const rows = useMemo(
    () => filterLeaderboardEntries(entries, search, providerFilter),
    [entries, search, providerFilter]
  );

  const tableHeight = useMemo(() => {
    if (rows.length === 0) {
      return LEADERBOARD_EMPTY_HEIGHT;
    }
    if (variant === "page") {
      return Math.max(tableHeightFor(rows.length), LEADERBOARD_PAGE_HEIGHT);
    }
    return tableHeightFor(rows.length);
  }, [rows.length, variant]);

  const selectedTrackedIds = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            selectedIds.includes(row.key) && row.trackedAccountId !== null
        )
        .map((row) => row.trackedAccountId)
        .filter((id): id is string => id !== null),
    [rows, selectedIds]
  );

  const columns = useMemo<TableColumn<LeaderboardEntry>[]>(
    () => [
      {
        key: "rank",
        header: "Rank",
        width: "5.75rem",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-base tabular-nums">{row.rank}</span>
        ),
      },
      {
        key: "username",
        header: (
          <span className="inline-flex items-center gap-1.5">
            Accounts
            <span className="text-muted-foreground font-normal tabular-nums">
              ({rows.length})
            </span>
          </span>
        ),
        width: "1.8fr",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar
              className={cn(
                "size-8 shrink-0",
                isSquareTwitterAvatar(row.verifiedType) && "rounded-md"
              )}
            >
              {row.profileImageUrl && (
                <AvatarImage
                  alt={row.displayName ?? row.username}
                  className={cn(
                    isSquareTwitterAvatar(row.verifiedType) && "rounded-md"
                  )}
                  src={row.profileImageUrl}
                />
              )}
              <AvatarFallback className="text-[0.625rem]">
                {row.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <span className="truncate">
                        {row.displayName ?? row.username}
                      </span>
                      <XVerificationBadge
                        className="size-3.5 shrink-0"
                        verified={row.verified}
                        verifiedType={row.verifiedType}
                      />
                    </span>
                    <span className="text-muted-foreground truncate font-mono text-[0.6875rem]">
                      @{row.username}
                    </span>
                  </span>
                }
              />
              <TooltipContent>
                {row.displayName ? `${row.displayName} · ` : ""}@{row.username}
              </TooltipContent>
            </Tooltip>
          </span>
        ),
        sortValue: (row) => row.displayName ?? row.username,
      },
      {
        key: "interactions",
        header: "Interactions",
        width: "8.75rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-sm tabular-nums">
            {formatMetric(row.interactions)}
          </span>
        ),
      },
      {
        key: "impressions",
        header: "Impressions",
        width: "8.75rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {formatMetric(row.impressions)}
          </span>
        ),
        sortValue: (row) => row.impressions ?? 0,
      },
      {
        key: "posts",
        header: "Posts",
        width: "5.625rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {row.posts}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "4rem",
        align: "right",
        cell: (row) =>
          row.trackedAccountId ? (
            <Button
              aria-label={`Stop tracking @${row.username}`}
              disabled={untrack.isPending}
              onClick={(event) => {
                event.stopPropagation();
                if (row.trackedAccountId) {
                  untrack.mutate(row.trackedAccountId);
                }
              }}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </Button>
          ) : null,
      },
    ],
    [untrack, rows.length]
  );

  return (
    <InstrumentSection
      action={<AnalyticsRangePicker control={range} />}
      eyebrow="Leaderboard"
    >
      {entries.length === 0 && !isPending ? (
        <InstrumentEmpty
          className="h-32"
          message="No accounts yet"
          seed="Leaderboard"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-72">
              <HugeiconsIcon
                className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                icon={SearchIcon}
                size={15}
              />
              <Input
                aria-label="Filter accounts by handle or name"
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter by handle or name..."
                value={search}
              />
            </div>
            <PlatformTabs
              items={ANALYTICS_PROVIDER_FILTERS.map((option) => ({
                value: option.value,
                label: option.value === "all" ? "All Platforms" : option.label,
                collapsedLabel: option.value === "all" ? "All" : undefined,
                icon:
                  option.value === "all" ? undefined : (
                    <ProviderIcon provider={option.value} />
                  ),
              }))}
              label="Filter by platform"
              onValueChange={(value) =>
                setProviderFilter(toProviderFilter(value))
              }
              value={providerFilter}
            />
            {selectedTrackedIds.length > 0 && (
              <Button
                disabled={untrack.isPending}
                onClick={() => {
                  for (const trackedAccountId of selectedTrackedIds) {
                    untrack.mutate(trackedAccountId);
                  }
                  setSelectedIds([]);
                }}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                Stop tracking {selectedTrackedIds.length}
              </Button>
            )}
          </div>
          <Table
            className="rounded-2xl"
            columns={columns}
            data={rows}
            defaultSort={{ key: "rank", direction: "asc" }}
            emptyState="No accounts match these filters"
            getRowId={(row) => row.key}
            height={tableHeight}
            loading={isPending || isPlaceholderData}
            onRowClick={(row) =>
              router.push(
                `/${organizationSlug}/analytics/accounts/${encodeURIComponent(row.username)}`
              )
            }
            onSelectionChange={setSelectedIds}
            resizable
            rowHeight={TABLE_ROW_HEIGHT}
            selectable
            selectedRowIds={selectedIds}
          />
        </div>
      )}
    </InstrumentSection>
  );
}
