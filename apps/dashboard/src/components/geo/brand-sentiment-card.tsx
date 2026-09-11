"use client";

import { SentimentDistribution } from "@/components/geo/sentiment-distribution";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { useGeoSentiment } from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const data = query.isSuccess ? query.data : undefined;
  return (
    <InstrumentGrid className="grid-cols-1 items-start gap-4 overflow-visible lg:grid-cols-12">
      <SentimentTrendCard
        points={data?.points}
        comparison={data?.comparison}
        summary={data?.summary}
        isPending={query.isPending}
        isError={query.isError}
        isScanning={isScanning}
        retry={() => query.refetch()}
      />
      <SentimentDistribution
        data={data}
        isPending={query.isPending}
        isError={query.isError}
        retry={() => query.refetch()}
      />
      <SentimentThemes
        organizationId={organizationId}
        summary={data?.summary}
        aggregatePending={query.isPending}
      />
    </InstrumentGrid>
  );
}
