"use client";

import { todayIsoDate } from "@notra/geo-core/utils/day-label";
import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "use-intl";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "@/constants/charts";
import {
  TRAFFIC_HERO_CHART_OPTIONS,
  TRAFFIC_HERO_CHART_SURFACE_CLASS,
  TRAFFIC_HERO_TREND_STROKE_WIDTH,
} from "@/constants/geo-traffic-hero";
import {
  WEB_TREND_AGENTS_KEY,
  WEB_TREND_PEOPLE_KEY,
} from "@/constants/web-analytics";
import type { ChartConfig } from "@/types/charts";
import type { WebVisitorsSectionProps } from "@/types/geo";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { formatChartInteger } from "@/utils/geo-charts";
import {
  buildWebTrendRows,
  formatWebShare,
  webTrendShare,
} from "@/utils/web-analytics";

export function WebTrendChart({
  web,
  traffic,
  range,
}: WebVisitorsSectionProps) {
  const t = useTranslations("geo.webVisitors");
  const locale = useLocale();
  const rows = buildWebTrendRows(
    web.points,
    traffic?.points ?? [],
    locale,
    range?.from,
    range?.to
  );
  if (rows.length === 0) {
    return null;
  }
  const share = webTrendShare(rows);
  const series = [
    {
      key: WEB_TREND_PEOPLE_KEY,
      label: t("people"),
      share: share?.people,
      color: CHART_PRIMARY_COLOR,
    },
    {
      key: WEB_TREND_AGENTS_KEY,
      label: t("agentsSeries"),
      share: share?.agents,
      color: CHART_SECONDARY_COLOR,
    },
  ];
  const config: ChartConfig = Object.fromEntries(
    series.map((entry) => [
      entry.key,
      { label: entry.label, colors: seriesColors(entry.color) },
    ])
  );
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();

  return (
    <div className={TRAFFIC_HERO_CHART_SURFACE_CLASS}>
      <h3 className="mb-3 text-sm font-medium">{t("trendTitle")}</h3>
      <EChartsAreaChart
        animation={false}
        chartOptions={TRAFFIC_HERO_CHART_OPTIONS}
        className="h-52 w-full cursor-crosshair @md/hero:h-64"
        config={config}
        curveType="monotone"
        data={rows}
        stackType="stacked"
        xDataKey="day"
      >
        <EChartsAreaChart.Grid variant="solid" />
        <EChartsAreaChart.XAxis dataKey="day" />
        <EChartsAreaChart.YAxis />
        {series.map((entry) => (
          <EChartsAreaChart.Area
            dataKey={entry.key}
            enableBufferLine={markIncompleteTail}
            key={entry.key}
            strokeVariant="solid"
            strokeWidth={TRAFFIC_HERO_TREND_STROKE_WIDTH}
            variant="gradient"
          >
            <EChartsAreaChart.ActiveDot variant="border" />
          </EChartsAreaChart.Area>
        ))}
        <EChartsAreaChart.Tooltip
          confine={false}
          labelFormatter={(day: string) => formatFullDayLabel(day, locale)}
          labelKey="rawDay"
          position="fixed"
          roundness="xl"
          scrub={rows.length > 1}
          valueFormatter={(value: number) => formatChartInteger(value, locale)}
        />
      </EChartsAreaChart>
      <ul className="border-border mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-xs">
        {series.map((entry) => (
          <li className="flex items-center gap-1.5" key={entry.key}>
            <span
              aria-hidden="true"
              className="corner-squircle size-2 rounded-xs bg-(--dot-light) dark:bg-(--dot-dark)"
              style={
                {
                  "--dot-light": entry.color.light,
                  "--dot-dark": entry.color.dark,
                } as CSSProperties
              }
            />
            <span>{entry.label}</span>
            {entry.share === undefined ? null : (
              <span className="text-muted-foreground tabular-nums">
                {t("share", { share: formatWebShare(entry.share) })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
