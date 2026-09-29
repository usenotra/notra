import { GEO_BRAND_LABELS } from "@notra/geo-core/constants/geo";

import type { ChartConfig } from "@/types/charts";
import { seriesColors } from "@/utils/chart-colors";

import {
  CHART_MUTED_COLOR,
  CHART_PRIMARY_COLOR,
  CHART_SECONDARY_COLOR,
} from "./charts";

export const SENTIMENT_SCORE_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});
export const SENTIMENT_PERIOD_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
export const SENTIMENT_FAMILY_ORDER = Object.keys(GEO_BRAND_LABELS);
export const SENTIMENT_ESTIMATE_MIN_DAYS = 3;
export const SENTIMENT_ESTIMATE_MAX_DAYS = 3;
export const SENTIMENT_POLARITY_STYLES = {
  positive: { fill: "bg-geo-up", text: "text-geo-up" },
  neutral: { fill: "bg-muted-foreground/30", text: "text-muted-foreground" },
  negative: { fill: "bg-geo-down", text: "text-geo-down" },
};
export const SENTIMENT_CHART_CONFIG: ChartConfig = {
  score: {
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
  previous: {
    colors: seriesColors(CHART_SECONDARY_COLOR),
  },
  estimate: {
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
  noData: {
    colors: seriesColors(CHART_MUTED_COLOR),
  },
};

export const GEO_SENTIMENT_EMPTY_LABEL_KEYS = {
  noSavedAnswers: "noSavedAnswersRunA",
  noRatedMentions: "noRatedMentionsInThis",
} as const;

export const SENTIMENT_POLARITIES = [
  "positive",
  "neutral",
  "negative",
] as const;
export const SENTIMENT_MIX_COLORS = {
  positive: { light: ["#2F855A"], dark: ["#4CB07D"] },
  neutral: { light: ["#D4D4D8"], dark: ["#52525B"] },
  negative: { light: ["#D8402F"], dark: ["#EF7566"] },
};
export const SENTIMENT_BAND_STRONG_MIN = 75;
export const SENTIMENT_BAND_POSITIVE_MIN = 60;
export const SENTIMENT_BAND_MIXED_MIN = 40;

export const SENTIMENT_PREVIEW_BARS = [
  { id: "a", positive: 44, negative: 4 },
  { id: "b", positive: 48, negative: 6 },
  { id: "c", positive: 40, negative: 3 },
  { id: "d", positive: 52, negative: 5 },
  { id: "e", positive: 46, negative: 7 },
  { id: "f", positive: 50, negative: 4 },
  { id: "g", positive: 42, negative: 6 },
  { id: "h", positive: 54, negative: 3 },
  { id: "i", positive: 47, negative: 5 },
  { id: "j", positive: 51, negative: 4 },
  { id: "k", positive: 45, negative: 6 },
  { id: "l", positive: 49, negative: 3 },
  { id: "m", positive: 43, negative: 5 },
  { id: "n", positive: 53, negative: 4 },
  { id: "o", positive: 46, negative: 6 },
  { id: "p", positive: 50, negative: 5 },
  { id: "q", positive: 44, negative: 3 },
  { id: "r", positive: 48, negative: 6 },
  { id: "s", positive: 52, negative: 4 },
  { id: "t", positive: 45, negative: 5 },
] as const;
export const SENTIMENT_PREVIEW_ENGINE_SHARES = [58, 52, 38, 34] as const;
