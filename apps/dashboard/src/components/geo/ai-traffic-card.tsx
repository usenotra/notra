"use client";

import {
  GEO_EMPTY_TRAFFIC_RESPONSE,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_SPARKLINE_TREND_CLASS,
  GEO_TRAFFIC_MARKDOWN_COLUMN_KEY,
} from "@notra/geo-core/constants/geo";
import {
  buildTrafficTrendRows,
  formatAiTrafficTimestamp,
  hasTrafficSourceSeries,
  toGeoTrafficPreviousTotals,
  sparklineTrend,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import { useMemo, useState } from "react";

import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { TrafficHero } from "@/components/geo/traffic-hero";
import { TrafficMarkdownCell } from "@/components/geo/traffic-markdown-cell";
import { TrafficPurposeCell } from "@/components/geo/traffic-purpose-cell";
import { TrafficSourceGroupCell } from "@/components/geo/traffic-source-group-cell";
import { TrafficSourcesGroup } from "@/components/geo/traffic-sources-group";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import type { TableColumn } from "@/components/motion/table";
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

export function AiTrafficCard({ traffic, settingsHref }: AiTrafficCardProps) {
  const { sources, totals, points, previousConversions } =
    traffic ?? GEO_EMPTY_TRAFFIC_RESPONSE;
  const previousTotals = toGeoTrafficPreviousTotals(
    sources,
    previousConversions
  );
  const trendRows = buildTrafficTrendRows(points);
  const groups = groupTrafficSources(sources);
  const crawlerGroups = groups.filter((group) => group.band === "crawler");
  const citedGroups = groups.filter((group) => group.band === "cited");
  const referralGroups = groups.filter((group) => group.band === "ai_referral");
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
  const crawlersCollapsed = collapsed.has("crawler");
  const sparklineDays = useMemo(() => trafficSparklineDays(points), [points]);
  const canSparkline = hasTrafficSourceSeries(points);
  const seriesByGroup = new Map<string, { day: string; value: number }[]>();
  if (canSparkline) {
    for (const group of groups) {
      const values = buildTrafficGroupSeries(points, group, sparklineDays);
      seriesByGroup.set(
        trafficGroupKey(group.band, group.key),
        sparklineDays.map((day, index) => ({
          day,
          value: values[index] ?? 0,
        }))
      );
    }
  }

  const columns: TableColumn<GeoTrafficSourceGroup>[] = [
    {
      key: "source",
      header: "Source",
      width: "1fr",
      sortable: true,
      cell: (row) => <TrafficSourceGroupCell group={row} />,
      sortValue: (row) => row.label,
    },
    {
      key: "category",
      header: "Purpose",
      width: "9.5rem",
      sortable: true,
      cell: (row) => <TrafficPurposeCell group={row} />,
      sortValue: (row) => row.categories.join(","),
    },
    {
      key: "visits",
      header: "Visits",
      width: "10.5rem",
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
    {
      key: GEO_TRAFFIC_MARKDOWN_COLUMN_KEY,
      header: "Markdown",
      width: "8.5rem",
      minWidth: "8.5rem",
      sortable: true,
      cell: (row) => {
        if (row.markdownVisits <= 0) {
          return <span className="tabular-nums">-</span>;
        }

        return (
          <TrafficMarkdownCell
            markdownVisits={row.markdownVisits}
            visits={row.visits}
          />
        );
      },
      sortValue: (row) =>
        row.visits === 0 ? 0 : row.markdownVisits / row.visits,
    },
    {
      key: "paths",
      header: "Pages",
      width: "5.625rem",
      sortable: true,
      cell: (row) => <span className="text-sm tabular-nums">{row.paths}</span>,
    },
    {
      key: "lastSeenAt",
      header: "Last seen",
      width: "9.375rem",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt)}
        </span>
      ),
    },
  ];

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
        <div className="flex flex-col">
          <TrafficSourcesGroup
            band="crawler"
            collapsed={crawlersCollapsed}
            columns={columns}
            groups={crawlerGroups}
            onToggle={() => toggleCollapsed("crawler")}
            stacked={false}
          />
          <TrafficSourcesGroup
            band="cited"
            collapsed={collapsed.has("cited")}
            columns={columns}
            groups={citedGroups}
            onToggle={() => toggleCollapsed("cited")}
            stacked
          />
          <TrafficSourcesGroup
            band="ai_referral"
            collapsed={collapsed.has("ai_referral")}
            columns={columns}
            groups={referralGroups}
            onToggle={() => toggleCollapsed("ai_referral")}
            stacked
          />
        </div>
      </InstrumentSection>
    </div>
  );
}
