"use client";

import {
  GEO_EMPTY_TRAFFIC_RESPONSE,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_SPARKLINE_TREND_CLASS,
  GEO_TRAFFIC_OTHER_GROUP,
} from "@notra/geo-core/constants/geo";
import {
  buildTrafficTrendRows,
  formatAiTrafficTimestamp,
  hasTrafficSourceSeries,
  toGeoTrafficPreviousTotals,
  sparklineTrend,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { TrafficHero } from "@/components/geo/traffic-hero";
import { TrafficPurposeCell } from "@/components/geo/traffic-purpose-cell";
import { TrafficSourceGroupCell } from "@/components/geo/traffic-source-group-cell";
import { TrafficSourceSheet } from "@/components/geo/traffic-source-sheet";
import { TrafficSourcesStack } from "@/components/geo/traffic-sources-group";
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
  trafficGroupPathsAreLowerBound,
} from "@/utils/ai-traffic-groups";

export function AiTrafficCard({
  traffic,
  pages,
  range,
  settingsHref,
  isPending = false,
  showHero = true,
}: AiTrafficCardProps) {
  const t = useTranslations("geo.aiTrafficCard");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.shared");
  const locale = useLocale();
  const { sources, totals, points, previousConversions } =
    traffic ?? GEO_EMPTY_TRAFFIC_RESPONSE;
  const previousTotals = toGeoTrafficPreviousTotals(
    sources,
    previousConversions
  );
  const groups = groupTrafficSources(sources).map((group) =>
    group.key === GEO_TRAFFIC_OTHER_GROUP.key
      ? { ...group, label: tCommon("labels.other") }
      : group
  );
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
  const sparklineDays = useMemo(
    () => trafficSparklineDays(points, range?.from, range?.to),
    [points, range?.from, range?.to]
  );
  const trendRows = buildTrafficTrendRows(points, locale, sparklineDays);
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
        header: tCommon("labels.source"),
        width: "1fr",
        minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.source,
        sortable: true,
        cell: (row) => <TrafficSourceGroupCell group={row} />,
        sortValue: (row) => row.label,
      },
      {
        key: "category",
        header: tShared("purpose"),
        width: categorySize,
        minWidth: categorySize,
        sortable: true,
        cell: (row) => <TrafficPurposeCell group={row} />,
        sortValue: (row) => row.categories.join(","),
      },
      {
        key: "visits",
        header: tShared("visits"),
        width: visitsSize,
        minWidth: visitsSize,
        align: "right",
        sortable: true,
        cell: (row) => {
          const series = seriesByGroup.get(trafficGroupKey(row.band, row.key));
          const showSpark =
            series !== undefined && series.length >= GEO_SPARKLINE_MIN_POINTS;

          return (
            <span className="flex items-center justify-end gap-2">
              {showSpark ? (
                <GeoRateSparkline
                  className={GEO_SPARKLINE_TREND_CLASS[sparklineTrend(series)]}
                  label={t("visitTrend", { source: row.label })}
                  points={series}
                />
              ) : null}
              <span className="min-w-8 text-right text-sm tabular-nums">
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
          header: tShared("paths"),
          collapsePriority: 1,
          width: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          minWidth: TRAFFIC_SOURCE_COLUMN_MIN_WIDTH.paths,
          sortable: true,
          align: "right",
          cell: (row) => (
            <span className="text-sm tabular-nums">
              {trafficGroupPathsAreLowerBound(row) ? "≥ " : null}
              <AnimatedNumber locale={locale} value={row.paths} />
            </span>
          ),
        },
        {
          key: "lastSeenAt",
          header: tShared("lastSeen"),
          collapsePriority: 2,
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
  }, [isMobile, locale, seriesByGroup, t, tCommon, tShared]);

  if (groups.length === 0) {
    return (
      <InstrumentSection eyebrow={tCommon("labels.sources")}>
        <InstrumentEmpty
          message={tShared("noAiTrafficCapturedYet")}
          seed="geo-traffic-sources"
        />
      </InstrumentSection>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showHero ? (
        <TrafficHero
          groups={groups}
          points={points}
          previousTotals={previousTotals}
          rows={trendRows}
          settingsHref={settingsHref}
          totals={totals}
        />
      ) : null}
      <InstrumentSection eyebrow={tCommon("labels.sources")}>
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
