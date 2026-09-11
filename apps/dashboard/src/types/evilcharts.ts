import type { ReactNode } from "react";

import type { EChartsAreaChartProps } from "@/components/evilcharts/charts/echarts-area-chart-impl";
import type { EChartsBarChartProps } from "@/components/evilcharts/charts/echarts-bar-chart-impl";
import type { EChartsLineChartProps } from "@/components/evilcharts/charts/echarts-line-chart-impl";
import type { EChartsPieChartProps } from "@/components/evilcharts/charts/echarts-pie-chart-impl";

export type LazyAreaChart = <TData extends Record<string, unknown>>(
  props: EChartsAreaChartProps<TData>
) => ReactNode;
export type LazyBarChart = <TData extends Record<string, unknown>>(
  props: EChartsBarChartProps<TData>
) => ReactNode;
export type LazyLineChart = <TData extends Record<string, unknown>>(
  props: EChartsLineChartProps<TData>
) => ReactNode;
export type LazyPieChart = <TData extends Record<string, unknown>>(
  props: EChartsPieChartProps<TData>
) => ReactNode;

export interface LazyChartBoundaryProps {
  children: ReactNode;
  className?: string;
}
