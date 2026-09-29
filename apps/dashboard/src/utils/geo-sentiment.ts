import type { GeoSentimentResponse } from "@notra/geo-core/types/geo-sentiment";

import type {
  SentimentTrendCardProps,
  SentimentThemesMessage,
  SentimentThemesStateInput,
} from "@/types/geo-sentiment";

export function isolatedSentimentPointIndices(
  points: readonly Pick<GeoSentimentResponse["points"][number], "score">[]
): number[] {
  return points.flatMap((point, index) =>
    point.score !== null &&
    points[index - 1]?.score == null &&
    points[index + 1]?.score == null
      ? [index]
      : []
  );
}

export function sentimentHasDisplayableData(
  summary?: GeoSentimentResponse["summary"]
): boolean {
  return Boolean(summary && summary.classifiedMentions > 0);
}

export function sentimentSummaryShowsEmpty(
  summary?: GeoSentimentResponse["summary"]
): boolean {
  return Boolean(summary && !sentimentHasDisplayableData(summary));
}

export function sentimentEmptyMessageKey(
  summary?: GeoSentimentResponse["summary"]
): "noSavedAnswers" | "noRatedMentions" {
  if (
    summary &&
    summary.classifiedMentions +
      summary.unknownMentions +
      summary.notMentioned ===
      0
  ) {
    return "noSavedAnswers";
  }
  return "noRatedMentions";
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
  let message: SentimentThemesMessage | null = null;
  if (state?.status === "ready") {
    message = { kind: "key", key: "noSupportedThemes" };
  }
  if (state?.status === "failed") {
    message = state.message
      ? { kind: "text", text: state.message }
      : { kind: "key", key: "couldNotFind" };
  }
  if (noRatings) {
    message = { kind: "empty", key: sentimentEmptyMessageKey(summary) };
  }
  if (state?.status === "unavailable") {
    message = state.message
      ? { kind: "text", text: state.message }
      : { kind: "key", key: "notConfigured" };
  }
  const settled = !loading && !isError && !busy && !noRatings;
  const showResults =
    !isError && !noRatings && (state?.result?.themes.length ?? 0) > 0;
  let statusKey: "loading" | "finding" | null = null;
  if (loading) {
    statusKey = "loading";
  }
  if (busy) {
    statusKey = "finding";
  }
  const canAnalyze =
    settled &&
    !!summary &&
    (state?.status === "stale" || state?.status === "failed");
  return {
    pending: (busy || loading) && !showResults,
    message,
    statusKey,
    showResults,
    showTable: loading || showResults,
    showEmpty: !loading && !isError && !showResults,
    canAnalyze,
  };
}
