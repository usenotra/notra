import type { FC } from "react";

import type {
  BarProps,
  LegendProps,
  TooltipProps,
  XAxisProps,
  YAxisProps,
} from "./echarts-bar-chart-impl";

// Declarative config markers for the chart root. They render nothing and are
// matched by reference, so they live outside the implementation module — that
// lets the lazy wrapper expose them without loading ECharts.

export const Bar: FC<BarProps> = () => null;
export const XAxis: FC<XAxisProps> = () => null;
export const YAxis: FC<YAxisProps> = () => null;
export const Grid: FC = () => null;
export const Tooltip: FC<TooltipProps> = () => null;
export const Legend: FC<LegendProps> = () => null;
