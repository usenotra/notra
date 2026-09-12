import { Button } from "@notra/ui/components/ui/button";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import { InstrumentEmpty } from "@/components/instrument/instrument-module";
import type { SentimentSummaryProps } from "@/types/geo-sentiment";
import { sentimentEmptyMessage } from "@/utils/geo-sentiment";

export function SentimentSummary({
  data,
  isPending,
  isError,
  retry,
}: SentimentSummaryProps) {
  const summary = data?.summary;
  return (
    <aside aria-label="Sentiment summary" className="min-w-0 p-5 lg:p-6">
      {isPending ? <SentimentSkeleton compact /> : null}
      {isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>Could not load sentiment summary.</p>
          <Button size="sm" variant="ghost" onClick={retry}>
            Retry summary
          </Button>
        </div>
      ) : null}
      {summary ? (
        <SentimentScore summary={summary} comparison={data?.comparison} />
      ) : null}
      {summary && summary.classifiedMentions === 0 ? (
        <InstrumentEmpty
          seed="Sentiment summary"
          className="mt-5 h-auto min-h-40 [&_p]:normal-case"
          message={sentimentEmptyMessage(summary)}
          preview={<EmptyStateTablePreview columns={[90, 70, 60]} rows={3} />}
        />
      ) : null}
    </aside>
  );
}
