import type { ChartColorPair } from "@/types/charts";

/** Matches `--geo-search`. Light stays on `--primary`; dark is lifted. */
export const CHART_PRIMARY_COLOR: ChartColorPair = {
  light: "#8B5CF6",
  dark: "#9C87E3",
};

/** Matches `--geo-memory`. Same lightness as Search; teal near sRGB max. */
export const CHART_SECONDARY_COLOR: ChartColorPair = {
  light: "#18929F",
  dark: "#20ABBA",
};

/** Series gold: 3:1 on white. Not a Search or Memory hue. */
const SERIES_GOLD: ChartColorPair = {
  light: "#B68F3C",
  dark: "#DAB15E",
};

export const CHART_SEARCH_FILL_CLASS = "bg-geo-search";
export const CHART_MEMORY_FILL_CLASS = "bg-geo-memory";

export const CHART_MUTED_COLOR: ChartColorPair = {
  light: "#8A8A94",
  dark: "#9A9AA4",
};

export const ACCOUNT_SERIES_COLORS: readonly ChartColorPair[] = [
  { light: "#358FF3", dark: "#5AA6F6" },
  { light: "#1FA85B", dark: "#3ED187" },
  { light: "#E07B1A", dark: "#FF9F45" },
  { light: "#DB3FA3", dark: "#F062BE" },
  { light: "#DC4343", dark: "#F06A6A" },
  SERIES_GOLD,
  { light: "#6B6B75", dark: "#9A9AA4" },
];

export const CHART_OTHER_SLICE_LABEL = "Other";
export const SHARE_OF_VOICE_AGGREGATE_ID = "aggregate:other";
export const SHARE_OF_VOICE_AGGREGATE_LABEL = "Other brands";
export const SHARE_OF_VOICE_RANKING_LIMIT = 4;
export const CHART_PERCENT_SCALE = 100;
export const CHART_MIN_BAR_PERCENT = 2;
export const SPARKLINE_SERIES_KEY = "value";

export const SPARKLINE_CHART_OPTIONS: Record<string, unknown> = {
  grid: { left: 1, right: 1, top: 2, bottom: 1, containLabel: false },
};

export const DONUT_INNER_RADIUS = "58%";
export const DONUT_OUTER_RADIUS = "82%";

export const COMPETITOR_SWATCHES: readonly string[] = [
  CHART_PRIMARY_COLOR.light,
  CHART_SECONDARY_COLOR.light,
  "#E0632F",
  "#2E9E5B",
  "#D4348B",
  SERIES_GOLD.light,
  "#3A6FF0",
  "#6B6B75",
];

/** Rivals skip Search (brand) and Memory hues so those roles stay exclusive. */
export const RIVAL_SWATCHES: readonly string[] = COMPETITOR_SWATCHES.slice(2);

export const GEO_TRAFFIC_PROVIDER_COLORS: readonly ChartColorPair[] = [
  { light: "#6B6B75", dark: "#9A9AA4" },
  ...ACCOUNT_SERIES_COLORS,
];
