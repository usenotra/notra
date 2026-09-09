"use client";

import type { ReactNode } from "react";

import {
  createLazyChartLoader,
  useLazyChart,
} from "@/components/evilcharts/ui/use-lazy-chart";
import { cn } from "@/lib/utils";

import type { EChartsPieChartProps } from "./echarts-pie-chart-impl";
import {
  Background,
  Label,
  Legend,
  Pie,
  Tooltip,
} from "./echarts-pie-chart-parts";

export type * from "./echarts-pie-chart-impl";

// The chart container in the implementation; the placeholder mirrors it so the
// box is identical before and after the ECharts chunk loads.
const CHART_BOX_CLASS = "relative flex flex-col text-xs";

type ChartComponent = <TData extends Record<string, unknown>>(
  props: EChartsPieChartProps<TData>
) => ReactNode;

const chartLoader = createLazyChartLoader<ChartComponent>(() =>
  import("./echarts-pie-chart-impl").then((module) => module.EChartsPieChart)
);

/** ECharts is loaded on the client only, after hydration — see `useLazyChart`. */
export function EChartsPieChart<TData extends Record<string, unknown>>(
  props: EChartsPieChartProps<TData>
) {
  const Chart = useLazyChart(chartLoader);

  if (!Chart) {
    return <div className={cn(CHART_BOX_CLASS, props.className)} />;
  }

  return <Chart {...props} />;
}

EChartsPieChart.Background = Background;
EChartsPieChart.Label = Label;
EChartsPieChart.Legend = Legend;
EChartsPieChart.Pie = Pie;
EChartsPieChart.Tooltip = Tooltip;