import { Button } from "@notra/ui/components/ui/button";

import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import type { SentimentSummaryProps } from "@/types/geo-sentiment";
import {
  sentimentHasDisplayableData,
  sentimentSummaryShowsEmpty,
} from "@/utils/geo-sentiment";

export function SentimentSummary({
  data,
  isPending,
  isError,
  retry,
}: SentimentSummaryProps) {
  const summary = data?.summary;
  const showData = sentimentHasDisplayableData(summary);
  const showEmpty = sentimentSummaryShowsEmpty(summary);
  return (
    <aside aria-label="Sentiment summary" className="min-w-0 px-5 pt-4 pb-1">
      {isPending ? <SentimentSkeleton compact /> : null}
      {isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>Could not load sentiment summary.</p>
          <Button size="sm" variant="ghost" onClick={retry}>
            Retry summary
          </Button>
        </div>
      ) : null}
      {summary && showData ? (
        <SentimentScore summary={summary} comparison={data?.comparison} />
      ) : null}
      {showEmpty ? (
        <div className="grid min-h-40 grid-cols-1 gap-x-6 gap-y-3 pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
              0
            </span>
            <span className="text-muted-foreground text-sm">/ 100</span>
          </div>
          <div className="pt-2 sm:pt-0">
            <p className="text-muted-foreground mb-2 text-xs">Score position</p>
            <div className="from-geo-down to-geo-up relative h-2 rounded-full bg-linear-to-r via-amber-200">
              <span className="bg-foreground ring-background absolute top-1/2 left-0 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2" />
            </div>
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
