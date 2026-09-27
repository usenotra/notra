"use client";

import {
  GEO_SPARKLINE_MIN_POINTS,
  GEO_TRAFFIC_FUNNEL_STAGES,
  GEO_TRAFFIC_OTHER_GROUP,
  GEO_TRAFFIC_TREND_CRAWLER_KEY,
  GEO_TRAFFIC_TREND_REFERRAL_KEY,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficFunnelStageKey } from "@notra/geo-core/types/geo";
import {
  trafficSparklineDays,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { Button } from "@notra/ui/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { TrafficProviderLegend } from "@/components/geo/traffic-provider-legend";
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "@/constants/charts";
import {
  TRAFFIC_HERO_CHART_SURFACE_CLASS,
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRIC_CELL_CLASS,
  TRAFFIC_HERO_METRIC_VALUE_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
  TRAFFIC_HERO_METRICS_STANDALONE_CLASS,
  TRAFFIC_HERO_METRICS_SURFACE_CLASS,
} from "@/constants/geo-traffic-hero";
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
  trafficTrendProviderKey,
  trafficTrendProviderTypeKey,
} from "@/utils/ai-traffic-trend";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { engineIconHtml } from "@/utils/engine-icon-html";
import { formatChartInteger } from "@/utils/geo-charts";

const HERO_CHART_OPTIONS = {
  grid: { left: 4, right: 8, top: 8, bottom: 4, containLabel: true },
};

const TRAFFIC_TREND_STROKE_WIDTH = 1.5;

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
  const t = useTranslations("geo.trafficHero");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <div className={TRAFFIC_HERO_METRIC_CELL_CLASS}>
      <p className="text-foreground/75 text-sm leading-5 font-semibold tracking-tight text-pretty">
        {metric.label}
      </p>
      {metric.value === null ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 self-start @sm/hero:gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "text-muted-foreground",
              TRAFFIC_HERO_METRIC_VALUE_CLASS
            )}
            title={t("notConfigured")}
          >
            —
          </span>
          <span className="sr-only">{t("notConfigured")}</span>
          <Button
            nativeButton={false}
            render={<Link href={settingsHref} />}
            size="sm"
            title={t("setUpTitle")}
            variant="outline"
          >
            {tCommon("labels.setUp")}
          </Button>
        </div>
      ) : (
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 self-start">
          <AnimatedNumber
            className={TRAFFIC_HERO_METRIC_VALUE_CLASS}
            value={metric.value}
          />
          <GeoStatDelta
            delta={metric.delta}
            hint={tGeoShared("vsPreviousPeriodOfThe")}
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
  const t = useTranslations("geo.trafficHero");
  const tShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tInstrument = useTranslations("geo.directions.instrument");
  const tGeoSharedStages = useTranslations("geo.shared");
  const stageLabels: Record<GeoTrafficFunnelStageKey, string> = {
    crawler: t("stages.crawler.label"),
    cited: tGeoSharedStages("citedInAnswer"),
    aiReferral: tGeoSharedStages("aiReferrals"),
    conversions: t("stages.conversions.label"),
  };
  const locale = useLocale();
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();
  const showTrend = rows.length >= GEO_SPARKLINE_MIN_POINTS;
  const days = trafficSparklineDays(points);

  const metrics: TrafficTrendMetric[] = GEO_TRAFFIC_FUNNEL_STAGES.map(
    (stage) => ({
      key: stage.key,
      label: stageLabels[stage.key],
      description: t(`stages.${stage.key}.description`),
      value: totals[stage.key],
      delta: metricDelta(
        totals[stage.key],
        previousTotals === null ? null : previousTotals[stage.key]
      ),
    })
  );

  const providers = buildTrafficTrendProviders(
    groups.flatMap((group) => group.members)
  ).map((provider) =>
    provider.key === trafficTrendProviderKey(GEO_TRAFFIC_OTHER_GROUP.key)
      ? { ...provider, label: tCommon2("labels.other") }
      : provider
  );
  const providerSeries = buildTrafficTrendSeries(providers);
  const chartRows = buildTrafficTrendRowsForProviders(
    points,
    providers,
    days,
    hiddenKeys,
    locale
  );
  const config: ChartConfig = {
    [GEO_TRAFFIC_TREND_CRAWLER_KEY]: {
      label: tShared("crawlers"),
      colors: seriesColors(CHART_PRIMARY_COLOR),
    },
    [GEO_TRAFFIC_TREND_REFERRAL_KEY]: {
      label: tShared("referrals"),
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
    <div className={TRAFFIC_HERO_FRAME_CLASS}>
      <div
        className={cn(
          TRAFFIC_HERO_METRICS_GRID_CLASS,
          showTrend
            ? TRAFFIC_HERO_METRICS_SURFACE_CLASS
            : TRAFFIC_HERO_METRICS_STANDALONE_CLASS
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
        <div
          className={TRAFFIC_HERO_CHART_SURFACE_CLASS}
          data-chart-title={tInstrument("aiTraffic")}
        >
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t("activity")}</h2>
            <TrafficProviderLegend
              hiddenKeys={hiddenKeys}
              onToggle={(key) =>
                setHiddenKeys((current) => toggleTrafficTrendKey(current, key))
              }
              series={providerSeries}
            />
          </div>
          <EChartsAreaChart
            animation={false}
            chartOptions={HERO_CHART_OPTIONS}
            className="h-52 w-full cursor-crosshair @md/hero:h-72"
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
              labelFormatter={(day: string) => formatFullDayLabel(day, locale)}
              labelKey="rawDay"
              layout="activity"
              position="fixed"
              rowGroups={tooltipGroups}
              roundness="xl"
              scrub
              valueFormatter={(value: number) =>
                formatChartInteger(value, locale)
              }
            />
          </EChartsAreaChart>
        </div>
      ) : null}
    </div>
  );
}
