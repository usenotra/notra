"use client";

import type { ReactNode } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import {
  createLazyChartLoader,
  useLazyChart,
} from "@/components/evilcharts/ui/use-lazy-chart";
import { cn } from "@/lib/utils";

import type { EChartsLineChartProps } from "./echarts-line-chart-impl";
import {
  ActiveDot,
  Dot,
  Grid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "./echarts-line-chart-parts";

export type * from "./echarts-line-chart-impl";

// The chart container in the implementation; the placeholder mirrors it so the
// box is identical before and after the ECharts chunk loads.
const CHART_BOX_CLASS = "relative flex flex-col text-xs";

type ChartComponent = <TData extends Record<string, unknown>>(
  props: EChartsLineChartProps<TData>
) => ReactNode;

const chartLoader = createLazyChartLoader<ChartComponent>(() =>
  import("./echarts-line-chart-impl").then((module) => module.EChartsLineChart)
);

/** ECharts is loaded on the client only, after hydration — see `useLazyChart`. */
export function EChartsLineChart<TData extends Record<string, unknown>>(
  props: EChartsLineChartProps<TData>
) {
  const Chart = useLazyChart(chartLoader);

  if (!Chart) {
    return <div className={cn(CHART_BOX_CLASS, props.className)} />;
  }

  return <Chart {...props} />;
}

EChartsLineChart.ActiveDot = ActiveDot;
EChartsLineChart.Brush = Brush;
EChartsLineChart.Dot = Dot;
EChartsLineChart.Grid = Grid;
EChartsLineChart.Legend = Legend;
EChartsLineChart.Line = Line;
EChartsLineChart.Tooltip = Tooltip;
EChartsLineChart.XAxis = XAxis;
EChartsLineChart.YAxis = YAxis;