import type { FC } from "react";

import type {
  BackgroundProps,
  LabelProps,
  LegendProps,
  PieProps,
  TooltipProps,
} from "./echarts-pie-chart-impl";

// Declarative config markers for the chart root. They render nothing and are
// matched by reference, so they live outside the implementation module — that
// lets the lazy wrapper expose them without loading ECharts.

export const Pie: FC<PieProps> = () => null;
export const Label: FC<LabelProps> = () => null;
export const Tooltip: FC<TooltipProps> = () => null;
export const Legend: FC<LegendProps> = () => null;
export const Background: FC<BackgroundProps> = () => null;
