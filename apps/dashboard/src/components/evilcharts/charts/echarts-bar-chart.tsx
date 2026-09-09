"use client";

import { lazy } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import { LazyChartBoundary } from "@/components/evilcharts/ui/lazy-chart-boundary";
import type { LazyBarChart } from "@/types/evilcharts";

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

const Chart = lazy(() =>
  import("./echarts-bar-chart-impl").then((module) => ({
    default: module.EChartsBarChart,
  }))
) as LazyBarChart;

export function EChartsBarChart<TData extends Record<string, unknown>>(
  props: EChartsBarChartProps<TData>
) {
  return (
    <LazyChartBoundary className={props.className}>
      <Chart {...props} />
    </LazyChartBoundary>
  );
}

EChartsBarChart.Bar = Bar;
EChartsBarChart.Brush = Brush;
EChartsBarChart.Grid = Grid;
EChartsBarChart.Legend = Legend;
EChartsBarChart.Tooltip = Tooltip;
EChartsBarChart.XAxis = XAxis;
EChartsBarChart.YAxis = YAxis;
