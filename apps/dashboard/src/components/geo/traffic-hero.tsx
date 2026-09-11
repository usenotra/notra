"use client";

import {
  GEO_SPARKLINE_MIN_POINTS,
  GEO_TRAFFIC_CONVERSIONS_NOT_CONFIGURED_LABEL,
  GEO_TRAFFIC_CONVERSIONS_SETUP_LABEL,
  GEO_TRAFFIC_FUNNEL_STAGES,
  GEO_TRAFFIC_STAT_TREND_HINT,
  GEO_TRAFFIC_TREND_CRAWLER_KEY,
  GEO_TRAFFIC_TREND_CRAWLER_LABEL,
  GEO_TRAFFIC_TREND_REFERRAL_KEY,
  GEO_TRAFFIC_TREND_REFERRAL_LABEL,
} from "@notra/geo-core/constants/geo";
import {
  trafficSparklineDays,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";
import { useState } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { TrafficProviderLegend } from "@/components/geo/traffic-provider-legend";
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "@/constants/charts";
import { cn } from "@/lib/utils";
import type { ChartConfig, TooltipRowGroup } from "@/types/charts";
import type {
  TrafficHeroMetricProps,
  TrafficHeroProps,
  TrafficTrendMetric,
} from "@/types/geo";
import {
  buildTrafficTrendProviders,
  buildTrafficTrendRowsForProviders,
  buildTrafficTrendSeries,
  toggleTrafficTrendKey,
  trafficTrendProviderTypeKey,
} from "@/utils/ai-traffic-trend";
import { seriesColors } from "@/utils/chart-colors";
import { engineIconHtml } from "@/utils/engine-icon-html";
import { formatChartInteger } from "@/utils/geo-charts";

const HERO_CHART_OPTIONS = {
  grid: { left: 4, right: 8, top: 8, bottom: 4, containLabel: true },
};

const TRAFFIC_TREND_STROKE_WIDTH = 1.5;

const HERO_METRIC_CELL_CLASS =
  "border-border flex min-w-0 flex-col gap-3 border-b px-5 py-5 last:border-b-0 sm:px-6 sm:odd:border-r sm:nth-[n+3]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0";

function metricDelta(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) {
    return null;
  }
  return trafficVisitDelta(current, previous);
}

function TrafficHeroMetric({ metric, settingsHref }: TrafficHeroMetricProps) {
  return (
    <div className={HERO_METRIC_CELL_CLASS}>
      <p className="text-foreground/75 text-base leading-6 font-semibold tracking-tight">
        {metric.label}
      </p>
      {metric.value === null ? (
        <div className="flex items-center gap-3 self-start">
          <span
            aria-hidden="true"
            className="text-muted-foreground text-4xl leading-none font-semibold tracking-tight"
            title={GEO_TRAFFIC_CONVERSIONS_NOT_CONFIGURED_LABEL}
          >
            —
          </span>
          <span className="sr-only">
            {GEO_TRAFFIC_CONVERSIONS_NOT_CONFIGURED_LABEL}
          </span>
          <Button
            nativeButton={false}
            render={<Link href={settingsHref} />}
            size="sm"
            title={GEO_TRAFFIC_CONVERSIONS_SETUP_LABEL}
            variant="outline"
          >
            Set up
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 self-start">
          <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
            {metric.value.toLocaleString()}
          </span>
          <GeoStatDelta
            className="rounded-md px-2 py-1.5 text-xs leading-4 [&>span]:hidden"
            delta={metric.delta}
            hint={GEO_TRAFFIC_STAT_TREND_HINT}
            label={metric.label}
          />
        </div>
      )}
    </div>
  );
}

export function TrafficHero({
  totals,
  previousTotals,
  rows,
  groups,
  points,
  settingsHref,
}: TrafficHeroProps) {
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();
  const showTrend = rows.length >= GEO_SPARKLINE_MIN_POINTS;
  const days = trafficSparklineDays(points);

  const metrics: TrafficTrendMetric[] = GEO_TRAFFIC_FUNNEL_STAGES.map(
    (stage) => ({
      key: stage.key,
      label: stage.label,
      description: stage.description,
      value: totals[stage.key],
      delta: metricDelta(
        totals[stage.key],
        previousTotals === null ? null : previousTotals[stage.key]
      ),
    })
  );

  const providers = buildTrafficTrendProviders(
    groups.flatMap((group) => group.members)
  );
  const providerSeries = buildTrafficTrendSeries(providers);
  const chartRows = buildTrafficTrendRowsForProviders(
    points,
    providers,
    days,
    hiddenKeys
  );
  const config: ChartConfig = {
    [GEO_TRAFFIC_TREND_CRAWLER_KEY]: {
      label: GEO_TRAFFIC_TREND_CRAWLER_LABEL,
      colors: seriesColors(CHART_PRIMARY_COLOR),
    },
    [GEO_TRAFFIC_TREND_REFERRAL_KEY]: {
      label: GEO_TRAFFIC_TREND_REFERRAL_LABEL,
      colors: seriesColors(CHART_SECONDARY_COLOR),
    },
    ...Object.fromEntries(
      providerSeries.flatMap((entry) => {
        const item = {
          label: entry.label,
          colors: entry.colors,
          ...(entry.icon === null
            ? {}
            : { indicatorHtml: engineIconHtml(entry.icon, false) }),
        };
        return [
          [entry.key, item],
          [trafficTrendProviderTypeKey(entry.key, "crawler"), item],
          [trafficTrendProviderTypeKey(entry.key, "ai_referral"), item],
        ];
      })
    ),
  };
  const visibleProviders = providerSeries.filter(
    (entry) => !hiddenKeys.has(entry.key)
  );
  const tooltipGroups: TooltipRowGroup[] = [
    {
      headingKey: GEO_TRAFFIC_TREND_CRAWLER_KEY,
      rowKeys: visibleProviders.map((entry) =>
        trafficTrendProviderTypeKey(entry.key, "crawler")
      ),
    },
    {
      headingKey: GEO_TRAFFIC_TREND_REFERRAL_KEY,
      rowKeys: visibleProviders.map((entry) =>
        trafficTrendProviderTypeKey(entry.key, "ai_referral")
      ),
    },
  ];
  const anyVisible = providerSeries.some((entry) => !hiddenKeys.has(entry.key));

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          showTrend && "bg-muted/40"
        )}
      >
        {metrics.map((metric) => (
          <TrafficHeroMetric
            key={metric.key}
            metric={metric}
            settingsHref={settingsHref}
          />
        ))}
      </div>
      {showTrend ? (
        <div className="border-border border-t p-4">
          <EChartsAreaChart
            animation={false}
            chartOptions={HERO_CHART_OPTIONS}
            className="h-72 w-full"
            config={config}
            curveType="monotone"
            data={chartRows}
            xDataKey="day"
          >
            <EChartsAreaChart.Grid variant="solid" />
            <EChartsAreaChart.XAxis dataKey="day" />
            <EChartsAreaChart.YAxis />
            <EChartsAreaChart.Area
              dataKey={GEO_TRAFFIC_TREND_CRAWLER_KEY}
              enableBufferLine={markIncompleteTail}
              strokeVariant="solid"
              strokeWidth={TRAFFIC_TREND_STROKE_WIDTH}
              variant="gradient"
              visible={anyVisible}
            >
              <EChartsAreaChart.ActiveDot variant="border" />
            </EChartsAreaChart.Area>
            <EChartsAreaChart.Area
              dataKey={GEO_TRAFFIC_TREND_REFERRAL_KEY}
              enableBufferLine={markIncompleteTail}
              strokeVariant="solid"
              strokeWidth={TRAFFIC_TREND_STROKE_WIDTH}
              variant="gradient"
              visible={anyVisible}
            >
              <EChartsAreaChart.ActiveDot variant="border" />
            </EChartsAreaChart.Area>
            <EChartsAreaChart.Tooltip
              confine={false}
              hideZeros
              layout="bars"
              position="fixed"
              rowGroups={tooltipGroups}
              roundness="xl"
              valueFormatter={formatChartInteger}
            />
          </EChartsAreaChart>
          <TrafficProviderLegend
            config={config}
            hiddenKeys={hiddenKeys}
            onToggle={(key) =>
              setHiddenKeys((current) => toggleTrafficTrendKey(current, key))
            }
            series={providerSeries}
          />
        </div>
      ) : null}
    </div>
  );
}
