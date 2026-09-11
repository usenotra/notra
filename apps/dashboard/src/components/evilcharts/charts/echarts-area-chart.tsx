"use client";

import { lazy } from "react";

import { Brush } from "@/components/evilcharts/ui/echarts-brush-part";
import { LazyChartBoundary } from "@/components/evilcharts/ui/lazy-chart-boundary";
import type { LazyAreaChart } from "@/types/evilcharts";

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

const Chart = lazy(() =>
  import("./echarts-area-chart-impl").then((module) => ({
    default: module.EChartsAreaChart,
  }))
) as LazyAreaChart;

export function EChartsAreaChart<TData extends Record<string, unknown>>(
  props: EChartsAreaChartProps<TData>
) {
  return (
    <LazyChartBoundary className={props.className}>
      <Chart {...props} />
    </LazyChartBoundary>
  );
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
