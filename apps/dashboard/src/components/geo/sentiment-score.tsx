import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";

import {
  SENTIMENT_SCORE_FORMAT,
  SENTIMENT_DELTA_FORMAT,
} from "@/constants/geo-sentiment";
import type { SentimentScoreProps } from "@/types/geo-sentiment";

export function SentimentScore({ summary, comparison }: SentimentScoreProps) {
  return (
    <div className="flex min-h-7 flex-wrap items-baseline gap-x-3 gap-y-1">
      <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {summary.score === null
          ? "—"
          : SENTIMENT_SCORE_FORMAT.format(summary.score)}{" "}
        <span className="text-muted-foreground text-xs font-normal">/ 100</span>
      </p>
      {comparison ? (
        <Tooltip>
          <TooltipTrigger
            className="text-muted-foreground focus-visible:outline-ring min-h-6 rounded-sm text-xs tabular-nums focus-visible:outline-2"
            aria-label="Score comparison and period dates"
          >
            {comparison.delta === null
              ? "No comparable score"
              : `${SENTIMENT_DELTA_FORMAT.format(comparison.delta)} pts vs. previous`}
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Current: {comparison.current.from} – {comparison.current.to}
            </p>
            <p>
              Previous: {comparison.previous.from} – {comparison.previous.to} ·
              UTC
            </p>
            <p>Difference in score points, not percent.</p>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
