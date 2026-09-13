import { Button } from "@notra/ui/components/ui/button";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import { InstrumentEmpty } from "@/components/instrument/instrument-module";
import type { SentimentSummaryProps } from "@/types/geo-sentiment";
import {
  sentimentEmptyMessage,
  sentimentHasDisplayableData,
} from "@/utils/geo-sentiment";

export function SentimentSummary({
  data,
  isPending,
  isError,
  retry,
}: SentimentSummaryProps) {
  const summary = data?.summary;
  const points = data?.points;
  const showData = sentimentHasDisplayableData(summary, points);
  const showEmpty = summary && (summary.classifiedMentions === 0 || !showData);
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
        <InstrumentEmpty
          seed="Sentiment summary"
          className="mt-5 h-auto min-h-40 [&_p]:normal-case"
          message={sentimentEmptyMessage(summary, points)}
          preview={<EmptyStateTablePreview columns={[90, 70, 60]} rows={3} />}
        />
      ) : null}
    </aside>
  );
}
