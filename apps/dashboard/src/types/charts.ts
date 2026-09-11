import type { ComponentType, ReactNode, RefObject } from "react";

export interface ChartColorPair {
  light: string;
  dark: string;
}

// Require at least one theme key — identical constraint to the repo's ChartConfig.
export type AtLeastOneThemeColor =
  | { light: string[]; dark?: string[] }
  | { light?: string[]; dark: string[] };

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
    colors?: AtLeastOneThemeColor;
    // Optional HTML (inline SVG/img) shown instead of the color swatch in bar tooltips.
    indicatorHtml?: string;
  }
>;

export interface ChartSeriesColors {
  light: string[];
  dark: string[];
}

export interface ChartColorScopeProps {
  config: ChartConfig;
  className?: string;
  children: ReactNode;
}

export interface ChartSparklineProps {
  data: number[];
  labels?: string[];
  color: ChartColorPair;
  className?: string;
  markIncompleteTail?: boolean;
  tooltipValueFormatter?: TooltipValueFormatter;
}

export interface SparklinePathInput {
  values: readonly number[];
  width: number;
  height: number;
  padding?: number;
}

export interface ChartMarker {
  value: string;
  label: string;
}

export interface GridProps {
  lineType?: "solid" | "dashed";
}

export type TooltipLayout = "rows" | "bars" | "activity";

export type TooltipValueFormatter = (value: number) => string;

export type TooltipLabelFormatter = (value: string) => string;

export type TooltipEmptyLabel =
  | string
  | ((row: Record<string, unknown> | undefined) => string);

export interface TooltipBodyItem {
  key: string;
  colorsCount: number;
  labelText: string;
  value: number | null;
  valueText: string;
  dimmed: string;
  indicatorHtml?: string;
  /** Resolved CSS background. Required when the tooltip mounts outside `[data-chart]`. */
  paint?: string;
}

export interface TooltipRowGroup {
  headingKey: string;
  rowKeys: readonly string[];
}

export interface TooltipBodyGroup {
  heading: TooltipBodyItem;
  items: TooltipBodyItem[];
}

export interface EChartsPlotFrameProps {
  chartId: string;
  className?: string;
  containerRef: RefObject<HTMLDivElement | null>;
  css: string;
  isLoading: boolean;
  mountRef: RefObject<HTMLDivElement | null>;
  plotBefore?: ReactNode;
  children?: ReactNode;
}
