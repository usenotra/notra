"use client";

import type { ReactNode } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import {
  createLazyChartLoader,
  useLazyChart,
} from "@/components/evilcharts/ui/use-lazy-chart";
import { cn } from "@/lib/utils";

import type { EChartsAreaChartProps } from "./echarts-area-chart-impl";
import {
  ActiveDot,
  Area,
  Dot,
  Grid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "./echarts-area-chart-parts";

export type * from "./echarts-area-chart-impl";

// The chart container in the implementation; the placeholder mirrors it so the
// box is identical before and after the ECharts chunk loads.
const CHART_BOX_CLASS = "relative flex flex-col text-xs";

type ChartComponent = <TData extends Record<string, unknown>>(
  props: EChartsAreaChartProps<TData>
) => ReactNode;

const chartLoader = createLazyChartLoader<ChartComponent>(() =>
  import("./echarts-area-chart-impl").then((module) => module.EChartsAreaChart)
);

/** ECharts is loaded on the client only, after hydration — see `useLazyChart`. */
export function EChartsAreaChart<TData extends Record<string, unknown>>(
  props: EChartsAreaChartProps<TData>
) {
  const Chart = useLazyChart(chartLoader);

  if (!Chart) {
    return <div className={cn(CHART_BOX_CLASS, props.className)} />;
  }

  return <Chart {...props} />;
}

EChartsAreaChart.ActiveDot = ActiveDot;
EChartsAreaChart.Area = Area;
EChartsAreaChart.Brush = Brush;
EChartsAreaChart.Dot = Dot;
EChartsAreaChart.Grid = Grid;
EChartsAreaChart.Legend = Legend;
EChartsAreaChart.Tooltip = Tooltip;
EChartsAreaChart.XAxis = XAxis;
EChartsAreaChart.YAxis = YAxis;