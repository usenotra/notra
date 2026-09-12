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
import { formatSentimentPeriod } from "@/utils/sentiment-dates";

export function SentimentScore({ summary, comparison }: SentimentScoreProps) {
  return (
    <div className="space-y-2">
      <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
        {summary.score === null
          ? "—"
          : SENTIMENT_SCORE_FORMAT.format(summary.score)}{" "}
        <span className="text-muted-foreground text-sm font-normal">/ 100</span>
      </p>
      {comparison ? (
        <Tooltip>
          <TooltipTrigger
            data-direction={Math.sign(comparison.delta ?? 0)}
            className="text-muted-foreground focus-visible:outline-ring data-[direction='1']:text-geo-up data-[direction='-1']:text-geo-down min-h-6 rounded-sm text-xs tabular-nums focus-visible:outline-2"
            aria-label="Score comparison and period dates"
          >
            {comparison.delta === null
              ? "No comparable score"
              : `${SENTIMENT_DELTA_FORMAT.format(comparison.delta)} pts vs. previous period`}
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Current:{" "}
              {formatSentimentPeriod(
                comparison.current.from,
                comparison.current.to
              )}
            </p>
            <p>
              Previous:{" "}
              {formatSentimentPeriod(
                comparison.previous.from,
                comparison.previous.to
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : null}
      {summary.score !== null ? (
        <div className="pt-4">
          <meter
            aria-label="Sentiment score position"
            min={0}
            max={100}
            value={summary.score}
            aria-valuetext={`${SENTIMENT_SCORE_FORMAT.format(summary.score)} out of 100`}
            className="sr-only"
          />
          <p className="text-muted-foreground mb-3 text-xs">Score position</p>
          <div className="from-geo-down to-geo-up relative h-2 rounded-full bg-linear-to-r via-amber-200">
            <Tooltip>
              <TooltipTrigger
                className="focus-visible:outline-ring absolute -top-2.5 flex size-7 -translate-x-1/2 cursor-default items-center justify-center rounded-sm focus-visible:outline-2"
                style={{ left: `${summary.score}%` }}
                aria-label={`Current sentiment score: ${SENTIMENT_SCORE_FORMAT.format(summary.score)} out of 100`}
              >
                <span
                  aria-hidden="true"
                  className="bg-foreground ring-background h-4 w-1 rounded-full ring-2"
                />
              </TooltipTrigger>
              <TooltipContent className="tabular-nums" sideOffset={6}>
                {SENTIMENT_SCORE_FORMAT.format(summary.score)} / 100
              </TooltipContent>
            </Tooltip>
          </div>
          <div
            aria-hidden="true"
            className="text-muted-foreground mt-2 flex justify-between text-[0.6875rem] tabular-nums"
          >
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
