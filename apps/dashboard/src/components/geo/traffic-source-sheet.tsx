"use client";

import {
  AI_TRAFFIC_PURPOSE_LABELS,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_TRAFFIC_STAT_TREND_HINT,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficSource } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoAgent,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";

import { DailyTrendChart } from "@/components/geo/daily-trend-chart";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { Table, type TableColumn } from "@/components/motion/table";
import { TRAFFIC_SOURCE_BAND_BADGE } from "@/constants/geo-traffic-sources";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  GeoTrafficGroupPage,
  TrafficSourceSheetContentProps,
  TrafficSourceSheetProps,
} from "@/types/geo";
import {
  trafficGroupPreviousVisits,
  trafficGroupTopPages,
  trafficVisitShare,
} from "@/utils/ai-traffic-groups";
import { tableHeightFor } from "@/utils/table";

const TOP_PAGES_LIMIT = 10;
const SHEET_TABLE_MAX_ROWS = 6;

function memberColumns(total: number): TableColumn<GeoTrafficSource>[] {
  return [
    {
      key: "agent",
      header: "Bot",
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <TrafficSourceGroupIcon
            className="size-3.5"
            group={{
              key: row.source,
              label: row.source,
              icon: resolveEngineIconKey(row.source) ? row.source : null,
            }}
          />
          <span className="truncate">
            {formatGeoAgent(row.agent || row.source)}
          </span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Purpose",
      width: "9rem",
      cell: (row) => (
        <span className="text-muted-foreground truncate text-xs">
          {AI_TRAFFIC_PURPOSE_LABELS[row.category] ?? row.category}
        </span>
      ),
    },
    {
      key: "visits",
      header: "Visits",
      width: "7.5rem",
      align: "right",
      cell: (row) => (
        <span className="flex items-baseline justify-end gap-2 tabular-nums">
          <span className="text-sm">{row.visits.toLocaleString()}</span>
          <span className="text-muted-foreground text-xs">
            {trafficVisitShare(row.visits, total)}
          </span>
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: "Last seen",
      width: "8.5rem",
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt)}
        </span>
      ),
    },
  ];
}

const PAGE_COLUMNS: TableColumn<GeoTrafficGroupPage>[] = [
  {
    key: "path",
    header: "Page",
    width: "1fr",
    cell: (row) => (
      <TruncateWithTooltip className="font-mono text-xs">
        {`${row.host}${row.path}`}
      </TruncateWithTooltip>
    ),
  },
  {
    key: "visits",
    header: "Visits",
    width: "6rem",
    align: "right",
    cell: (row) => (
      <span className="text-sm tabular-nums">
        {row.visits.toLocaleString()}
      </span>
    ),
  },
];

function formatShare(part: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;
}

function TrafficSourceSheetContent({
  group,
  series,
  pages,
}: TrafficSourceSheetContentProps) {
  const previous = trafficGroupPreviousVisits(group);
  const topPages = trafficGroupTopPages(pages, group, TOP_PAGES_LIMIT);
  const showMarkdown = group.band !== "ai_referral";
  const stats: { label: string; value: string; delta?: number | null }[] = [
    {
      label: "Visits",
      value: group.visits.toLocaleString(),
      delta:
        previous === null ? null : trafficVisitDelta(group.visits, previous),
    },
    { label: "Pages", value: group.paths.toLocaleString() },
    showMarkdown
      ? {
          label: "Markdown",
          value: formatShare(group.markdownVisits, group.visits),
        }
      : {
          label: group.visitorType === "crawler" ? "Bots" : "Sources",
          value: group.members.length.toLocaleString(),
        },
  ];
  const members = [...group.members].sort(
    (left, right) => right.visits - left.visits
  );

  return (
    <>
      <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
        <SheetTitle className="flex min-w-0 items-center gap-2 text-base leading-snug">
          <TrafficSourceGroupIcon group={group} />
          <span className="min-w-0 truncate">{group.label}</span>
          <Badge variant="secondary">
            {TRAFFIC_SOURCE_BAND_BADGE[group.band]}
          </Badge>
        </SheetTitle>
        <SheetDescription>
          Last seen {formatAiTrafficTimestamp(group.lastSeenAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <dl className="bg-muted/30 grid grid-cols-3 gap-4 rounded-xl border p-4">
          {stats.map((stat) => (
            <div className="flex min-w-0 flex-col gap-1.5" key={stat.label}>
              <dt className="text-muted-foreground truncate text-xs">
                {stat.label}
              </dt>
              <dd className="m-0 flex min-w-0 items-center gap-2">
                <span className="truncate text-xl leading-none font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </span>
                {stat.delta === undefined ? null : (
                  <GeoStatDelta
                    delta={stat.delta}
                    hint={GEO_TRAFFIC_STAT_TREND_HINT}
                    label={stat.label}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>

        {series.length >= GEO_SPARKLINE_MIN_POINTS ? (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Visits per day</h3>
            <DailyTrendChart label="Visits" points={series} />
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-medium">
            {group.visitorType === "crawler" ? "Bots" : "Sources"}
          </h3>
          <Table
            className="rounded-2xl"
            columns={memberColumns(group.visits)}
            data={members}
            getRowId={(row) => `${row.source}-${row.visitorType}`}
            height={tableHeightFor(
              Math.min(members.length, SHEET_TABLE_MAX_ROWS)
            )}
            rowHeight={TABLE_ROW_HEIGHT}
            scrollFade
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Top pages</h3>
          <Table
            className="rounded-2xl"
            columns={PAGE_COLUMNS}
            data={topPages}
            emptyState="No pages recorded for this source"
            getRowId={(row) => row.key}
            height={tableHeightFor(
              Math.min(topPages.length, SHEET_TABLE_MAX_ROWS)
            )}
            rowHeight={TABLE_ROW_HEIGHT}
            scrollFade
          />
        </section>
      </div>
    </>
  );
}

export function TrafficSourceSheet({
  group: groupProp,
  series,
  pages,
  onOpenChange,
}: TrafficSourceSheetProps) {
  const [group, releaseGroup] = useRetainedValue(groupProp);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseGroup}
      open={groupProp !== null}
    >
      <SheetContent className="gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl">
        {group ? (
          <TrafficSourceSheetContent
            group={group}
            pages={pages}
            series={series}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
