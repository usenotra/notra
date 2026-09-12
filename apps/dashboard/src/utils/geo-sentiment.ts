import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { sentimentFamilyScore } from "@notra/geo-core/utils/geo-sentiment";

import { SENTIMENT_FAMILY_ORDER } from "@/constants/geo-sentiment";
import type {
  SentimentFamilyRow,
  SentimentTrendCardProps,
  SentimentThemesStateInput,
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

export function sentimentEmptyMessage(
  summary?: GeoSentimentResponse["summary"]
) {
  if (
    summary &&
    summary.classifiedMentions +
      summary.unknownMentions +
      summary.notMentioned ===
      0
  ) {
    return "No saved answers. Run a scan or change the date range.";
  }
  return "No rated mentions in this period.";
}

export function sentimentThemesState({
  state,
  summary,
  isAnalyzing,
  isPending,
  isError,
  aggregatePending,
}: SentimentThemesStateInput) {
  const busy = !isError && (isAnalyzing || state?.status === "pending");
  const loading = !isError && (isPending || aggregatePending);
  const noRatings = summary?.classifiedMentions === 0;
  let message = "";
  if (state?.status === "ready") {
    message = "No supported themes in the sampled answers.";
  }
  if (state?.status === "failed") {
    message = state.message ?? "Could not find themes. Try again.";
  }
  if (noRatings) {
    message = sentimentEmptyMessage(summary);
  }
  if (state?.status === "unavailable") {
    message =
      state.message ?? "Theme analysis is not configured for this project.";
  }
  if (busy) {
    message = "Analyzing saved answers…";
  }
  const settled = !loading && !isError && !busy && !noRatings;
  const showResults =
    !isError && !noRatings && (state?.result?.themes.length ?? 0) > 0;
  let statusText = "";
  if (busy) {
    statusText = "Analyzing saved answers…";
  }
  if (loading) {
    statusText = "Loading analysis…";
  }
  const canAnalyze =
    settled &&
    !!summary &&
    (state?.status === "stale" || state?.status === "failed");
  return {
    pending: (busy || loading) && !showResults,
    title: showResults ? "Update themes" : "No themes yet",
    message,
    statusText,
    showResults,
    showTable: busy || loading || showResults,
    showEmpty: !loading && !busy && !isError && (!showResults || canAnalyze),
    canAnalyze,
  };
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
