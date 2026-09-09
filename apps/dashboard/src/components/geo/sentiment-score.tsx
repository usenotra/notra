import {
  SENTIMENT_SCORE_FORMAT,
  SENTIMENT_DELTA_FORMAT,
} from "@/constants/geo-sentiment";
import type { SentimentScoreProps } from "@/types/geo-sentiment";

export function SentimentScore({ summary, comparison }: SentimentScoreProps) {
  return (
    <>
      <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
        {summary.score === null
          ? "—"
          : SENTIMENT_SCORE_FORMAT.format(summary.score)}{" "}
        <span className="text-muted-foreground text-sm font-normal">/ 100</span>
      </p>
      {summary.score === null ? (
        <p className="text-muted-foreground text-sm">
          No rated mentions in this period.
        </p>
      ) : null}
      {comparison ? (
        <p className="text-muted-foreground text-sm">
          {comparison.delta === null
            ? "No comparable score for the previous period."
            : `${SENTIMENT_DELTA_FORMAT.format(comparison.delta)} score points vs. previous period`}
        </p>
      ) : null}
    </>
  );
}
