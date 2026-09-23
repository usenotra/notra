import type { ChartConfig } from "@/types/charts";
import { seriesColors } from "@/utils/chart-colors";

import { CHART_MUTED_COLOR, CHART_PRIMARY_COLOR } from "./charts";

export const ACCURACY_SCORE_HINT =
  "Share of confident factual claims that match your Knowledge facts. Unverifiable and low-confidence claims are coverage, not part of the score.";
export const ACCURACY_ANALYZE_ACTION = "Analyze";
export const ACCURACY_ANALYZE_CONFIRM_TITLE = "Check claims against Knowledge?";
export const ACCURACY_ANALYZE_CONFIRM =
  "Analyze saved answers for the selected project and date range. A new analysis uses AI credits based on token usage, or one AI answer on quota-based plans. Reusing a cached analysis has no additional cost.";
export const ACCURACY_VERDICT_LABELS = {
  accurate: "Accurate",
  inaccurate: "Inaccurate",
  unverifiable: "Unverifiable",
} as const;
export const ACCURACY_VERDICT_STYLES = {
  accurate: { fill: "bg-geo-up", text: "text-geo-up" },
  inaccurate: { fill: "bg-geo-down", text: "text-geo-down" },
  unverifiable: {
    fill: "bg-muted-foreground/30",
    text: "text-muted-foreground",
  },
} as const;
export const ACCURACY_VERDICT_ORDER = {
  inaccurate: 0,
  unverifiable: 1,
  accurate: 2,
} as const;
export const ACCURACY_SCORE_FORMAT = new Intl.NumberFormat("en", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const ACCURACY_COUNT_FORMAT = new Intl.NumberFormat("en");
export const ACCURACY_CHART_CONFIG: ChartConfig = {
  score: {
    label: "Accuracy",
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
  noData: {
    label: "No data",
    colors: seriesColors(CHART_MUTED_COLOR),
  },
};
