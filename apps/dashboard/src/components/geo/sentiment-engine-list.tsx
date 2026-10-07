import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useFormatter, useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { SentimentDistributionBar } from "@/components/geo/sentiment-distribution-bar";
import {
  SENTIMENT_POLARITIES,
  SENTIMENT_POLARITY_STYLES,
} from "@/constants/geo-sentiment";
import { cn } from "@/lib/utils";
import type { SentimentFamilyBucket } from "@/types/geo-sentiment";

export function SentimentEngineList({
  families,
}: {
  families: readonly SentimentFamilyBucket[];
}) {
  const t = useTranslations("geo.sentimentBreakdown");
  const tCommon = useTranslations("common.labels");
  const format = useFormatter();
  return (
    <InstrumentModule
      bodyClassName="flex min-h-0 flex-col divide-y overflow-y-auto p-0"
      // Side by side, the list takes the chart's height and scrolls instead of
      // stretching the whole row to fit every engine.
      className="h-full @min-[44rem]/main:col-span-5 @min-[44rem]/main:[contain:size]"
      eyebrow={t("byEngine")}
      readout={t("enginesCount", { count: families.length })}
      variant="table"
    >
      {families.map(({ family, iconEngine, label, bucket }) => (
        <Tooltip key={family}>
          <TooltipTrigger
            // A button, so keyboard users can open the breakdown too.
            className="hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-ring grid w-full grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-4 px-5 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
          >
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <EngineIcon className="size-4 shrink-0" engine={iconEngine} />
              <span className="truncate">{label}</span>
            </span>
            <SentimentDistributionBar bucket={bucket} className="h-1.5" />
            <span className="text-right font-semibold tabular-nums">
              {bucket.score === null
                ? "—"
                : format.number(Math.round(bucket.score))}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="flex min-w-40 flex-col gap-1.5 text-xs">
              <span className="font-medium">{label}</span>
              {bucket.classifiedMentions === 0 ? (
                <span className="opacity-70">{t("noRatedAnswers")}</span>
              ) : (
                <>
                  {SENTIMENT_POLARITIES.map((polarity) => (
                    <span className="flex items-center gap-1.5" key={polarity}>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 rounded-full",
                          // The tooltip is inverted; the page's neutral grey
                          // would vanish on it.
                          polarity === "neutral"
                            ? "bg-background/50"
                            : SENTIMENT_POLARITY_STYLES[polarity].fill
                        )}
                      />
                      <span className="opacity-70">{tCommon(polarity)}</span>
                      <span className="ml-auto font-medium tabular-nums">
                        {format.number(bucket[`${polarity}Share`] ?? 0, {
                          style: "percent",
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </span>
                  ))}
                  <span className="opacity-70">
                    {t("ratedAnswers", { count: bucket.classifiedMentions })}
                  </span>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </InstrumentModule>
  );
}
