import type { FC } from "react";

import type {
  AreaProps,
  DotProps,
  GridProps,
  LegendProps,
  TooltipProps,
  XAxisProps,
  YAxisProps,
} from "./echarts-area-chart-impl";

// Declarative config markers for the chart root. They render nothing and are
// matched by reference, so they live outside the implementation module — that
// lets the lazy wrapper expose them without loading ECharts.

export const Area: FC<AreaProps> = () => null;
export const Dot: FC<DotProps> = () => null;
export const ActiveDot: FC<DotProps> = () => null;
export const XAxis: FC<XAxisProps> = () => null;
export const YAxis: FC<YAxisProps> = () => null;
export const Grid: FC<GridProps> = () => null;
export const Tooltip: FC<TooltipProps> = () => null;
export const Legend: FC<LegendProps> = () => null;
