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
