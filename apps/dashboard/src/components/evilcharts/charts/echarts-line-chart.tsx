"use client";

import { lazy } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import { LazyChartBoundary } from "@/components/evilcharts/ui/lazy-chart-boundary";
import type { LazyLineChart } from "@/types/evilcharts";

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

const Chart = lazy(() =>
  import("./echarts-line-chart-impl").then((module) => ({
    default: module.EChartsLineChart,
  }))
) as LazyLineChart;

export function EChartsLineChart<TData extends Record<string, unknown>>(
  props: EChartsLineChartProps<TData>
) {
  return (
    <LazyChartBoundary className={props.className}>
      <Chart {...props} />
    </LazyChartBoundary>
  );
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
