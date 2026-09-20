"use client";

import { formatDayLabel, todayIsoDate } from "@notra/geo-core/utils/day-label";
import { useMemo } from "react";

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { CHART_PRIMARY_COLOR } from "@/constants/charts";
import type { ChartConfig } from "@/types/charts";
import type { DailyTrendChartProps } from "@/types/geo";
import { seriesColors } from "@/utils/chart-colors";

const DAILY_TREND_SERIES_KEY = "value";

/** Per-day bars with labelled axes, for the source and page drawers. */
export function DailyTrendChart({ points, label }: DailyTrendChartProps) {
  const config = useMemo<ChartConfig>(
    () => ({
      [DAILY_TREND_SERIES_KEY]: {
        label,
        colors: seriesColors(CHART_PRIMARY_COLOR),
      },
    }),
    [label]
  );
  const rows = useMemo(
    () =>
      points.map((point) => ({
        day: formatDayLabel(point.day),
        [DAILY_TREND_SERIES_KEY]: point.value,
      })),
    [points]
  );
  // Today is still filling up, so its bar is drawn as a buffer.
  const incompleteTail = points.at(-1)?.day === todayIsoDate();

  return (
    <EChartsBarChart
      animation={false}
      className="h-44 w-full"
      config={config}
      data={rows}
      xDataKey="day"
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis dataKey="day" />
      <EChartsBarChart.YAxis />
      <EChartsBarChart.Bar
        bufferBar={incompleteTail}
        dataKey={DAILY_TREND_SERIES_KEY}
      />
      <EChartsBarChart.Tooltip />
    </EChartsBarChart>
  );
}
