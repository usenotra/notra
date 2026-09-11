import { Button } from "@notra/ui/components/ui/button";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { SentimentFamilyList } from "@/components/geo/sentiment-family-list";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { SENTIMENT_POLARITY_STYLES } from "@/constants/geo-sentiment";
import type { SentimentDistributionProps } from "@/types/geo-sentiment";
import { sentimentEmptyMessage } from "@/utils/geo-sentiment";

export function SentimentDistribution({
  data,
  isPending,
  isError,
  retry,
}: SentimentDistributionProps) {
  const summary = data?.summary;
  return (
    <InstrumentModule
      eyebrow="Mention distribution"
      variant="table"
      className="lg:col-span-5"
      bodyClassName="gap-4"
    >
      {isPending ? <SentimentSkeleton compact /> : null}
      {isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>Could not load distribution.</p>
          <Button size="sm" variant="ghost" onClick={retry}>
            Retry distribution
          </Button>
        </div>
      ) : null}
      {summary && summary.classifiedMentions === 0 ? (
        <InstrumentEmpty
          seed="Mention distribution"
          className="h-auto min-h-40 [&_p]:normal-case"
          message={sentimentEmptyMessage(summary)}
          preview={<EmptyStateTablePreview columns={[90, 70, 60]} rows={3} />}
        />
      ) : null}
      {summary && summary.classifiedMentions > 0 ? (
        <>
          <p className="text-muted-foreground text-xs">
            {summary.classifiedMentions} rated mentions
          </p>
          <div
            className="flex h-3 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            {(["positive", "neutral", "negative"] as const).map((polarity) => (
              <span
                key={polarity}
                className={`h-full ${SENTIMENT_POLARITY_STYLES[polarity].fill}`}
                style={{
                  width: `${(summary[polarity] / summary.classifiedMentions) * 100}%`,
                }}
              />
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {(["positive", "neutral", "negative"] as const).map((polarity) => (
              <div key={polarity} className="space-y-1">
                <dt
                  className={`capitalize ${SENTIMENT_POLARITY_STYLES[polarity].text}`}
                >
                  {polarity}
                </dt>
                <dd className="text-lg font-medium tabular-nums">
                  {Math.round(
                    (summary[polarity] / summary.classifiedMentions) * 100
                  )}
                  %
                </dd>
                <dd className="text-muted-foreground tabular-nums">
                  {summary[polarity]} mentions
                </dd>
              </div>
            ))}
          </dl>
          <details className="text-muted-foreground text-xs">
            <summary className="focus-visible:outline-ring cursor-pointer py-1 focus-visible:outline-2">
              Distribution details
            </summary>
            <p className="pt-2">
              {summary.unknownMentions} unrated mentions and{" "}
              {summary.notMentioned} answers without a mention are excluded.
              Percentages use rated mentions only.
            </p>
          </details>
        </>
      ) : null}
      {data && data.engines.length > 0 ? (
        <details className="text-sm">
          <summary className="focus-visible:outline-ring cursor-pointer py-1 focus-visible:outline-2">
            Provider scores{" "}
            <span className="text-muted-foreground text-xs">/ 100</span>
          </summary>
          <SentimentFamilyList engines={data.engines} />
        </details>
      ) : null}
    </InstrumentModule>
  );
}
