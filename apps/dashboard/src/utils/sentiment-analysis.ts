import type { SentimentAnalysisState } from "@notra/geo-core/types/sentiment-analysis";

import type { SentimentAnalysisStatusKey } from "@/types/geo-sentiment";

export function sentimentAnalysisInterval(state?: SentimentAnalysisState) {
  switch (state?.status) {
    case "pending":
      return 3000;
    case "stale":
      return 30_000;
    default:
      return false;
  }
}

export function sentimentAnalysisStatus(
  state?: SentimentAnalysisState
): SentimentAnalysisStatusKey | null {
  switch (state?.status) {
    case "pending":
      return "finding";
    case "stale":
      return state.result ? "stalePrevious" : null;
    case "failed":
      return state.result ? "failedPrevious" : "failedRetry";
    case "unavailable":
      return "unavailable";
    default:
      return null;
  }
}
