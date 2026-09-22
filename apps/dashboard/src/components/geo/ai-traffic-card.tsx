"use client";

import {
  GEO_EMPTY_TRAFFIC_RESPONSE,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_SPARKLINE_TREND_CLASS,
} from "@notra/geo-core/constants/geo";
import {
  buildTrafficTrendRows,
  formatAiTrafficTimestamp,
  hasTrafficSourceSeries,
  toGeoTrafficPreviousTotals,
  sparklineTrend,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo, useState } from "react";

import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { TrafficHero } from "@/components/geo/traffic-hero";
import { TrafficPurposeCell } from "@/components/geo/traffic-purpose-cell";
import { TrafficSourceGroupCell } from "@/components/geo/traffic-source-group-cell";
import { TrafficSourceSheet } from "@/components/geo/traffic-source-sheet";
import { TrafficSourcesStack } from "@/components/geo/traffic-sources-group";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import type { TableColumn } from "@/components/motion/table";
import { TRAFFIC_SOURCE_COLUMN_MIN_WIDTH } from "@/constants/geo-traffic-sources";
import type {
  AiTrafficCardProps,
  GeoTrafficSourceBand,
  GeoTrafficSourceGroup,
} from "@/types/geo";
import {
  buildTrafficGroupSeries,
  groupTrafficSources,
  trafficGroupKey,
} from "@/utils/ai-traffic-groups";

export function AiTrafficCard({
  traffic,
  pages,
  settingsHref,
  isPending = false,
}: AiTrafficCardProps) {
  const { sources, totals, points, previousConversions } =
    traffic ?? GEO_EMPTY_TRAFFIC_RESPONSE;
  const previousTotals = toGeoTrafficPreviousTotals(
    sources,
    previousConversions
  );
  const trendRows = buildTrafficTrendRows(points);
  const groups = groupTrafficSources(sources);
  const [collapsed, setCollapsed] = useState<ReadonlySet<GeoTrafficSourceBand>>(
    () => new Set()
  );
  const toggleCollapsed = (band: GeoTrafficSourceBand) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(band)) {
        next.delete(band);
      } else {
        next.add(band);
      }
      return next;
    });
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const sparklineDays = useMemo(() => trafficSparklineDays(points), [points]);
  const canSparkline = hasTrafficSourceSeries(points);
  const seriesByGroup = useMemo(() => {
    const map = new Map<string, { day: string; value: number }[]>();
    if (!canSparkline) {
      return map;
    }

    for (const group of groups) {
      const values = buildTrafficGroupSeries(points, group, sparklineDays);
      map.set(
        trafficGroupKey(group.band, group.key),
        sparklineDays.map((day, index) => ({
          day,
          value: values[index] ?? 0,
        }))
      );
    }

    return map;
  }, [canSparkline, groups, points, sparklineDays]);

  const openGroup =
    openGroupKey === null
      ? null
      : (groups.find(
          (group) => trafficGroupKey(group.band, group.key) === openGroupKey
        ) ?? null);

  const columns = useMemo<TableColumn<GeoTrafficSourceGroup>[]>(() => {
    const categorySize = isMobile
      ? TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.categoryMobile
      : TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.category;
    const visitsSize = isMobile
      ? TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.visitsMobile
      : TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.visits;
    const next: TableColumn<GeoTrafficSourceGroup>[] = [
      {
        key: "source",
        header: "Source",
        width: "1fr",
        minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.source,
        sortable: true,
        cell: (row) => <TrafficSourceGroupCell group={row} />,
        sortValue: (row) => row.label,
      },
      {
        key: "category",
        header: "Purpose",
        width: categorySize,
        minWidth: categorySize,
        sortable: true,
        cell: (row) => <TrafficPurposeCell group={row} />,
        sortValue: (row) => row.categories.join(","),
      },
      {
        key: "visits",
        header: "Visits",
        width: visitsSize,
        minWidth: visitsSize,
        sortable: true,
        cell: (row) => {
          const series = seriesByGroup.get(trafficGroupKey(row.band, row.key));
          const showSpark =
            series !== undefined && series.length >= GEO_SPARKLINE_MIN_POINTS;

          return (
            <span className="flex items-center gap-2">
              {showSpark ? (
                <GeoRateSparkline
                  className={GEO_SPARKLINE_TREND_CLASS[sparklineTrend(series)]}
                  label={`${row.label} visit trend`}
                  points={series}
                />
              ) : null}
              <span className="text-sm tabular-nums">
                {row.visits.toLocaleString()}
              </span>
            </span>
          );
        },
      },
    ];

    if (!isMobile) {
      next.push(
        {
          key: "paths",
          header: "Pages",
          collapsePriority: 1,
          width: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          sortable: true,
          align: "right",
          cell: (row) => (
            <span className="text-sm tabular-nums">
              {row.paths.toLocaleString()}
            </span>
          ),
        },
        {
          key: "lastSeenAt",
          header: "Last seen",
          collapsePriority: 2,
          width: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.lastSeenAt,
          minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.lastSeenAt,
          sortable: true,
          cell: (row) => (
            <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
              {formatAiTrafficTimestamp(row.lastSeenAt)}
            </span>
          ),
        }
      );
    }

    return next;
  }, [isMobile, seriesByGroup]);

  if (sources.length === 0) {
    return (
      <InstrumentSection eyebrow="Sources">
        <InstrumentEmpty
          message="No AI traffic captured yet"
          seed="geo-traffic-sources"
        />
      </InstrumentSection>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TrafficHero
        groups={groups}
        points={points}
        previousTotals={previousTotals}
        rows={trendRows}
        settingsHref={settingsHref}
        totals={totals}
      />
      <InstrumentSection eyebrow="Sources">
        <TrafficSourcesStack
          collapsed={collapsed}
          columns={columns}
          groups={groups}
          loading={isPending}
          onOpen={(group) =>
            setOpenGroupKey(trafficGroupKey(group.band, group.key))
          }
          onToggle={toggleCollapsed}
        />
      </InstrumentSection>
      <TrafficSourceSheet
        group={openGroup}
        onOpenChange={(open) => {
          if (!open) {
            setOpenGroupKey(null);
          }
        }}
        pages={pages}
        series={openGroupKey ? (seriesByGroup.get(openGroupKey) ?? []) : []}
      />
    </div>
  );
}
