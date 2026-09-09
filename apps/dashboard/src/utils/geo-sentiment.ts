import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import type {
  SentimentTheme,
  SentimentAnalysisState,
} from "@notra/geo-core/types/sentiment-analysis";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { sentimentFamilyScore } from "@notra/geo-core/utils/geo-sentiment";

import { SENTIMENT_FAMILY_ORDER } from "@/constants/geo-sentiment";
import type {
  SentimentFamilyRow,
  SentimentAnalysisActionInput,
  SentimentThemeGroups,
  SentimentTrendPlotProps,
  SentimentTrendCardProps,
} from "@/types/geo-sentiment";

export function hasIsolatedSentimentPoint(
  points: readonly Pick<GeoSentimentResponse["points"][number], "score">[]
): boolean {
  return points.some(
    (point, index) =>
      point.score !== null &&
      points[index - 1]?.score == null &&
      points[index + 1]?.score == null
  );
}

export function sentimentFamilyRows(
  engines: GeoSentimentResponse["engines"]
): SentimentFamilyRow[] {
  const engineNames = engines.map(({ engine }) => engine).sort();
  const families = [...new Set(engineNames.map(engineFamilyOf))];
  return families
    .map((family) => ({
      family,
      iconEngine:
        engineNames.find((engine) => engineFamilyOf(engine) === family) ??
        family,
      label: engineFamilyLabel(family),
      score: sentimentFamilyScore(engines, family),
    }))
    .sort((left, right) => {
      const leftIndex = SENTIMENT_FAMILY_ORDER.indexOf(left.family);
      const rightIndex = SENTIMENT_FAMILY_ORDER.indexOf(right.family);
      return (
        (leftIndex < 0 ? Infinity : leftIndex) -
          (rightIndex < 0 ? Infinity : rightIndex) ||
        left.label.localeCompare(right.label, "en") ||
        left.family.localeCompare(right.family, "en")
      );
    });
}

export function sentimentAnalysisAction({
  status,
  busy,
  loading,
  failed,
}: SentimentAnalysisActionInput) {
  let label = "Analyze answers";
  if (status === "failed") {
    label = "Retry analysis";
  }
  if (status === "ready") {
    label = "Up to date";
  }
  if (busy) {
    label = "Analyzing…";
  }
  return {
    label,
    disabled:
      loading ||
      failed ||
      busy ||
      status === "unavailable" ||
      status === "ready",
  };
}

export function sentimentThemeGroups(
  themes: SentimentTheme[]
): SentimentThemeGroups {
  const groups: SentimentThemeGroups = { positive: [], negative: [] };
  for (const theme of themes) {
    groups[theme.polarity].push(theme);
  }
  return groups;
}

export function sentimentAnalysisNotice(
  state: SentimentAnalysisState | undefined,
  busy: boolean
) {
  return {
    showUsage: state?.status === "stale" || state?.status === "failed",
    message: busy ? "Analyzing saved answers…" : state?.message,
  };
}

export function sentimentTrendState({
  points,
  comparison,
  isPending,
  isError,
}: SentimentTrendCardProps) {
  let message = "No rated mentions in this period.";
  if (isPending) {
    message = "Loading sentiment…";
  }
  if (isError) {
    message = "Could not load sentiment.";
  }
  return {
    message,
    hasRatings:
      points?.some((point) => point.score !== null) ||
      comparison?.points.some((point) => point.score !== null),
  };
}

export function sentimentComparisonData({
  points,
  comparison,
  showCurrent,
  showPrevious,
}: SentimentTrendPlotProps) {
  return points.map(({ day, score }, index) => ({
    day,
    score: showCurrent ? score : null,
    previous: showPrevious ? (comparison?.points[index]?.score ?? null) : null,
  }));
}

export function sentimentComparisonLabel(
  day: string,
  points: GeoSentimentResponse["points"],
  comparison: GeoSentimentResponse["comparison"]
) {
  const previous =
    comparison?.points[points.findIndex((point) => point.day === day)]?.day;
  return previous
    ? `Current: ${day} · Previous: ${previous} (UTC)`
    : `${day} (UTC)`;
}
