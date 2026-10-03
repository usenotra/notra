import Color from "color";

import {
  ACCOUNT_SERIES_COLORS,
  CHART_MEMORY_FILL_CLASS,
  CHART_MUTED_COLOR,
  CHART_PRIMARY_COLOR,
  CHART_SEARCH_FILL_CLASS,
  CHART_SECONDARY_COLOR,
} from "@/constants/charts";
import type { ChartColorPair, ChartSeriesColors } from "@/types/charts";

/** How far toward white the far end of a donut sector fades, per theme. */
const SOFT_GRADIENT_LIGHT_TINT = 0.45;
const SOFT_GRADIENT_DARK_TINT = 0.3;

export function seriesColors(pair: ChartColorPair): ChartSeriesColors {
  return { light: [pair.light], dark: [pair.dark] };
}

export function geoModeFillClass(variant: "web" | "raw"): string {
  return variant === "web" ? CHART_SEARCH_FILL_CLASS : CHART_MEMORY_FILL_CLASS;
}

export function geoModeColor(variant: "web" | "raw"): ChartColorPair {
  return variant === "web" ? CHART_PRIMARY_COLOR : CHART_SECONDARY_COLOR;
}

export function accountSeriesColorPair(index: number): ChartColorPair {
  return (
    ACCOUNT_SERIES_COLORS[index % ACCOUNT_SERIES_COLORS.length] ??
    CHART_MUTED_COLOR
  );
}

export function accountSeriesColors(index: number): ChartSeriesColors {
  return seriesColors(accountSeriesColorPair(index));
}

/** Base color plus a lighter tint, so a sector reads as a soft gradient. */
export function softGradientColors(
  colors: Partial<ChartSeriesColors>
): ChartSeriesColors {
  const tint = (hex: string | undefined, amount: number) => {
    if (!hex) {
      return [];
    }
    try {
      return [hex, Color(hex).mix(Color("#ffffff"), amount).hex()];
    } catch {
      return [hex];
    }
  };
  return {
    light: tint(colors.light?.[0], SOFT_GRADIENT_LIGHT_TINT),
    dark: tint(colors.dark?.[0] ?? colors.light?.[0], SOFT_GRADIENT_DARK_TINT),
  };
}
