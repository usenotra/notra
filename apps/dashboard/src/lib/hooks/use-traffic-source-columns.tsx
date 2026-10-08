"use client";

import {
  GEO_SPARKLINE_MIN_POINTS,
  GEO_SPARKLINE_TREND_CLASS,
} from "@notra/geo-core/constants/geo";
import {
  formatAiTrafficTimestamp,
  sparklineTrend,
} from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { PurposeBadge } from "@/components/geo/purpose-badge";
import { TrafficPurposeCell } from "@/components/geo/traffic-purpose-cell";
import { TrafficSourceGroupCell } from "@/components/geo/traffic-source-group-cell";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { TRAFFIC_SOURCE_COLUMN_MIN_WIDTH } from "@/constants/geo-traffic-sources";
import type {
  GeoTrafficSourceGroup,
  UseTrafficSourceColumnsOptions,
} from "@/types/geo";
import { trafficGroupKey } from "@/utils/ai-traffic-groups";

/**
 * Columns of the AI traffic sources table: name, purpose badge, visits with a
 * sparkline, pages and last seen. The overview and the source drawer's bot
 * list share them so a row reads the same in both places.
 */
export function useTrafficSourceColumns({
  seriesByKey,
  rowsAreBots = false,
  sourceHeader,
}: UseTrafficSourceColumnsOptions): TableColumn<GeoTrafficSourceGroup>[] {
  const t = useTranslations("geo.aiTrafficCard");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.shared");
  const locale = useLocale();
  const isMobile = useIsMobile();

  return useMemo(() => {
    const categorySize = isMobile
      ? TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.categoryMobile
      : TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.category;
    const visitsSize = isMobile
      ? TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.visitsMobile
      : TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.visits;
    const next: TableColumn<GeoTrafficSourceGroup>[] = [
      {
        key: "source",
        header: sourceHeader ?? tCommon("labels.source"),
        width: "1fr",
        // The drawer is narrower than the page, so bot names get less room.
        minWidth: rowsAreBots
          ? TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.botSource
          : TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.source,
        sortable: true,
        cell: (row) =>
          rowsAreBots ? (
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <TrafficSourceGroupIcon group={row} />
              <span className="truncate">{row.label}</span>
            </span>
          ) : (
            <TrafficSourceGroupCell group={row} />
          ),
        sortValue: (row) => row.label,
      },
      {
        key: "category",
        header: tShared("purpose"),
        width: categorySize,
        minWidth: categorySize,
        // Only the drawer drops it, and last: the page table scrolls sideways.
        collapsePriority: rowsAreBots ? 1 : undefined,
        sortable: true,
        cell: (row) =>
          rowsAreBots ? (
            <PurposeBadge category={row.categories[0] ?? ""} />
          ) : (
            <TrafficPurposeCell group={row} />
          ),
        sortValue: (row) => row.categories.join(","),
      },
      {
        key: "visits",
        header: tShared("visits"),
        width: visitsSize,
        minWidth: visitsSize,
        sortable: true,
        cell: (row) => {
          const series = seriesByKey?.get(trafficGroupKey(row.band, row.key));
          const showSpark =
            series !== undefined && series.length >= GEO_SPARKLINE_MIN_POINTS;

          return (
            <span className="flex items-center gap-2">
              {showSpark ? (
                <GeoRateSparkline
                  className={GEO_SPARKLINE_TREND_CLASS[sparklineTrend(series)]}
                  label={t("visitTrend", { source: row.label })}
                  points={series}
                />
              ) : null}
              <span className="text-sm tabular-nums">
                <AnimatedNumber locale={locale} value={row.visits} />
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
          header: tShared("pages"),
          collapsePriority: rowsAreBots ? 2 : 1,
          width: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          sortable: true,
          align: "right",
          cell: (row) => (
            <span className="text-sm tabular-nums">
              <AnimatedNumber locale={locale} value={row.paths} />
            </span>
          ),
        },
        {
          key: "lastSeenAt",
          header: tShared("lastSeen"),
          collapsePriority: rowsAreBots ? 3 : 2,
          width: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.lastSeenAt,
          minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.lastSeenAt,
          sortable: true,
          cell: (row) => (
            <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
              {formatAiTrafficTimestamp(row.lastSeenAt, locale)}
            </span>
          ),
        }
      );
    }

    return next;
  }, [
    isMobile,
    locale,
    rowsAreBots,
    seriesByKey,
    sourceHeader,
    t,
    tCommon,
    tShared,
  ]);
}
