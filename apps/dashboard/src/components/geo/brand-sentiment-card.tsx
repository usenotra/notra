"use client";

import { SentimentSummary } from "@/components/geo/sentiment-summary";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { SENTIMENT_SCORE_HINT } from "@/constants/geo-sentiment";
import { useGeoSentiment } from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const data = query.isSuccess ? query.data : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <InstrumentModule
          eyebrow="Brand sentiment"
          hint={SENTIMENT_SCORE_HINT}
          variant="table"
          className="h-full"
          bodyClassName="min-w-0 p-0"
        >
          <SentimentTrendCard
            points={data?.points}
            comparison={data?.comparison}
            summary={data?.summary}
            isPending={query.isPending}
            isError={query.isError}
            isScanning={isScanning}
            retry={() => query.refetch()}
          />
        </InstrumentModule>
        <InstrumentModule
          eyebrow="Current sentiment score"
          variant="table"
          className="h-full"
          bodyClassName="min-w-0 p-0"
        >
          <SentimentSummary
            data={data}
            isPending={query.isPending}
            isError={query.isError}
            retry={() => query.refetch()}
          />
        </InstrumentModule>
      </div>
      <SentimentThemes
        organizationId={organizationId}
        summary={data?.summary}
        aggregatePending={query.isPending}
      />
    </div>
  );
}
