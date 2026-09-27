import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";

import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import { GEO_SENTIMENT_EMPTY_LABEL_KEYS } from "@/constants/geo-sentiment";
import type { SentimentSummaryProps } from "@/types/geo-sentiment";
import {
  sentimentEmptyMessageKey,
  sentimentHasDisplayableData,
  sentimentSummaryShowsEmpty,
} from "@/utils/geo-sentiment";

export function SentimentSummary({
  data,
  isPending,
  isError,
  retry,
}: SentimentSummaryProps) {
  const t = useTranslations("geo.sentimentSummary");
  const tGeoShared = useTranslations("geo.shared");
  const summary = data?.summary;
  const showData = sentimentHasDisplayableData(summary);
  const showEmpty = sentimentSummaryShowsEmpty(summary);
  return (
    <aside aria-label={t("label")} className="min-w-0 px-5 pt-4 pb-1">
      {isPending ? <SentimentSkeleton compact /> : null}
      {isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>{t("loadError")}</p>
          <Button size="sm" variant="ghost" onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {summary && showData ? (
        <SentimentScore summary={summary} comparison={data?.comparison} />
      ) : null}
      {showEmpty ? (
        <div className="grid min-h-40 grid-cols-1 gap-x-6 gap-y-3 pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
                —
              </span>
              <span className="text-muted-foreground text-sm">/ 100</span>
            </div>
            <p className="text-muted-foreground max-w-48 text-xs text-balance">
              {tGeoShared(
                GEO_SENTIMENT_EMPTY_LABEL_KEYS[
                  sentimentEmptyMessageKey(summary)
                ]
              )}
            </p>
          </div>
          <div className="pt-2 sm:pt-0">
            <p className="text-muted-foreground mb-2 text-xs">
              {tGeoShared("scorePosition")}
            </p>
            <div className="from-geo-down to-geo-up h-2 rounded-full bg-linear-to-r via-amber-200" />
            <div className="text-muted-foreground mt-2 flex justify-between text-[0.6875rem] tabular-nums">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
