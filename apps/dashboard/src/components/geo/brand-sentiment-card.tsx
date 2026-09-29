"use client";

import { SentimentBreakdown } from "@/components/geo/sentiment-breakdown";
import { SentimentBreakdownPlaceholder } from "@/components/geo/sentiment-breakdown-placeholder";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { useGeoSentiment } from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";
import {
  sentimentEmptyMessageKey,
  sentimentHasDisplayableData,
} from "@/utils/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const data = query.isSuccess ? query.data : undefined;
  const showData = sentimentHasDisplayableData(data?.summary);
  let placeholderState: "pending" | "error" | "empty" = "empty";
  if (query.isPending) {
    placeholderState = "pending";
  } else if (query.isError) {
    placeholderState = "error";
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {showData && data ? (
        <SentimentBreakdown
          data={data}
          isScanning={isScanning}
          organizationId={organizationId}
        />
      ) : (
        <SentimentBreakdownPlaceholder
          emptyKey={sentimentEmptyMessageKey(data?.summary)}
          isScanning={isScanning}
          retry={() => query.refetch()}
          state={placeholderState}
        />
      )}
      <SentimentThemes
        organizationId={organizationId}
        summary={data?.summary}
        aggregatePending={query.isPending}
      />
    </div>
  );
}
