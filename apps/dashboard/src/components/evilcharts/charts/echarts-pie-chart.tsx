"use client";

import { lazy } from "react";

import { LazyChartBoundary } from "@/components/evilcharts/ui/lazy-chart-boundary";
import type { LazyPieChart } from "@/types/evilcharts";

import type { EChartsPieChartProps } from "./echarts-pie-chart-impl";
import {
  Background,
  Label,
  Legend,
  Pie,
  Tooltip,
} from "./echarts-pie-chart-parts";

export type * from "./echarts-pie-chart-impl";

const Chart = lazy(() =>
  import("./echarts-pie-chart-impl").then((module) => ({
    default: module.EChartsPieChart,
  }))
) as LazyPieChart;

export function EChartsPieChart<TData extends Record<string, unknown>>(
  props: EChartsPieChartProps<TData>
) {
  return (
    <LazyChartBoundary className={props.className}>
      <Chart {...props} />
    </LazyChartBoundary>
  );
}

EChartsPieChart.Background = Background;
EChartsPieChart.Label = Label;
EChartsPieChart.Legend = Legend;
EChartsPieChart.Pie = Pie;
EChartsPieChart.Tooltip = Tooltip;
