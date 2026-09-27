import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useFormatter, useTranslations } from "next-intl";

import { SENTIMENT_SCORE_FORMAT } from "@/constants/geo-sentiment";
import type { SentimentScoreProps } from "@/types/geo-sentiment";

export function SentimentScore({ summary, comparison }: SentimentScoreProps) {
  const t = useTranslations("geo.sentimentScore");
  const tGeoShared = useTranslations("geo.shared");
  const format = useFormatter();
  const formatPeriod = (from: string, to: string) =>
    format.dateTimeRange(
      new Date(`${from}T00:00:00Z`),
      new Date(`${to}T00:00:00Z`),
      { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
    );
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div className="flex flex-col gap-1">
        <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
          {summary.score === null
            ? "—"
            : SENTIMENT_SCORE_FORMAT.format(summary.score)}{" "}
          {summary.score !== null ? (
            <span className="text-muted-foreground text-sm font-normal">
              / 100
            </span>
          ) : null}
        </p>
        {comparison ? (
          <Tooltip>
            <TooltipTrigger
              data-direction={Math.sign(comparison.delta ?? 0)}
              className="text-muted-foreground focus-visible:outline-ring data-[direction='1']:text-geo-up data-[direction='-1']:text-geo-down min-h-6 w-fit rounded-sm text-xs tabular-nums focus-visible:outline-2"
              aria-label={t("comparisonLabel")}
            >
              {comparison.delta === null
                ? t("noComparable")
                : t("deltaVsPrevious", {
                    delta: format.number(comparison.delta, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                      signDisplay: "exceptZero",
                    }),
                  })}
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("current", {
                  period: formatPeriod(
                    comparison.current.from,
                    comparison.current.to
                  ),
                })}
              </p>
              <p>
                {t("previous", {
                  period: formatPeriod(
                    comparison.previous.from,
                    comparison.previous.to
                  ),
                })}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {summary.score !== null ? (
        <div className="pt-2 sm:pt-0">
          <meter
            aria-label={t("positionLabel")}
            min={0}
            max={100}
            value={summary.score}
            aria-valuetext={t("outOf100", {
              score: SENTIMENT_SCORE_FORMAT.format(summary.score),
            })}
            className="sr-only"
          />
          <p className="text-muted-foreground mb-2 text-xs">
            {tGeoShared("scorePosition")}
          </p>
          <div className="from-geo-down to-geo-up relative h-2 rounded-full bg-linear-to-r via-amber-200">
            <Tooltip>
              <TooltipTrigger
                className="focus-visible:outline-ring absolute -top-2.5 flex size-7 -translate-x-1/2 cursor-default items-center justify-center rounded-sm focus-visible:outline-2"
                style={{ left: `${summary.score}%` }}
                aria-label={t("currentScoreLabel", {
                  score: SENTIMENT_SCORE_FORMAT.format(summary.score),
                })}
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
