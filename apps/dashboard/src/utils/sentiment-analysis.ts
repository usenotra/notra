import type { SentimentAnalysisState } from "@notra/geo-core/types/sentiment-analysis";

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

export function sentimentAnalysisStatus(state?: SentimentAnalysisState) {
  switch (state?.status) {
    case "pending":
      return "Analyzing saved answers…";
    case "stale":
      return state.result
        ? "Showing previous themes. Analysis needs an update."
        : "Run analysis to find themes";
    case "failed":
      return state.result
        ? "Analysis failed. Showing previous themes."
        : "Analysis failed. Try again.";
    case "unavailable":
      return "Theme analysis is unavailable.";
    default:
      return "";
  }
}
