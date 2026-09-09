"use client";

import type { ReactNode } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import {
  createLazyChartLoader,
  useLazyChart,
} from "@/components/evilcharts/ui/use-lazy-chart";
import { cn } from "@/lib/utils";

import type { EChartsBarChartProps } from "./echarts-bar-chart-impl";
import {
  Bar,
  Grid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "./echarts-bar-chart-parts";

export type * from "./echarts-bar-chart-impl";

// The chart container in the implementation; the placeholder mirrors it so the
// box is identical before and after the ECharts chunk loads.
const CHART_BOX_CLASS = "relative flex flex-col text-xs";

type ChartComponent = <TData extends Record<string, unknown>>(
  props: EChartsBarChartProps<TData>
) => ReactNode;

const chartLoader = createLazyChartLoader<ChartComponent>(() =>
  import("./echarts-bar-chart-impl").then((module) => module.EChartsBarChart)
);

/** ECharts is loaded on the client only, after hydration — see `useLazyChart`. */
export function EChartsBarChart<TData extends Record<string, unknown>>(
  props: EChartsBarChartProps<TData>
) {
  const Chart = useLazyChart(chartLoader);

  if (!Chart) {
    return <div className={cn(CHART_BOX_CLASS, props.className)} />;
  }

  return <Chart {...props} />;
}

EChartsBarChart.Bar = Bar;
EChartsBarChart.Brush = Brush;
EChartsBarChart.Grid = Grid;
EChartsBarChart.Legend = Legend;
EChartsBarChart.Tooltip = Tooltip;
EChartsBarChart.XAxis = XAxis;
EChartsBarChart.YAxis = YAxis;