import { GEO_BRAND_LABELS } from "@notra/geo-core/constants/geo";

import type { ChartConfig } from "@/types/charts";
import { seriesColors } from "@/utils/chart-colors";

import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "./charts";

export const SENTIMENT_SCORE_HINT =
  "AI-assessed tone toward your brand, from 0 to 100. Positive mentions count as 100, neutral as 50, and negative as 0. English, single-turn answers only. Unknown labels and non-mentions are excluded. This is a descriptive score, not confidence or a percentage.";
export const SENTIMENT_SCORE_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});
export const SENTIMENT_FAMILY_ORDER = Object.keys(GEO_BRAND_LABELS);
export const SENTIMENT_POLARITY_STYLES = {
  positive: { fill: "bg-geo-up", text: "text-geo-up" },
  neutral: { fill: "bg-geo-mid", text: "text-geo-mid" },
  negative: { fill: "bg-geo-down", text: "text-geo-down" },
};
export const SENTIMENT_DELTA_FORMAT = new Intl.NumberFormat("en", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
export const SENTIMENT_CHART_CONFIG: ChartConfig = {
  score: {
    label: "Current period",
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
  previous: {
    label: "Previous period",
    colors: seriesColors(CHART_SECONDARY_COLOR),
  },
};
