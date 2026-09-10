"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useId } from "react";

import { SentimentFamilyList } from "@/components/geo/sentiment-family-list";
import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentThemes } from "@/components/geo/sentiment-themes";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { SENTIMENT_SCORE_HINT } from "@/constants/geo-sentiment";
import { useGeoSentiment } from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const descriptionId = useId();
  return (
    <InstrumentGrid className="grid-cols-1 items-stretch gap-4 overflow-visible lg:grid-cols-12">
      <InstrumentModule
        eyebrow="Brand sentiment"
        variant="table"
        className="h-full lg:col-span-7"
        action={
          <Tooltip>
            <TooltipTrigger
              aria-label="About the sentiment score"
              aria-describedby={descriptionId}
              className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={InformationCircleIcon}
                size={14}
              />
            </TooltipTrigger>
            <TooltipContent>{SENTIMENT_SCORE_HINT}</TooltipContent>
          </Tooltip>
        }
        bodyClassName="flex flex-1 flex-col gap-4"
      >
        <span id={descriptionId} className="sr-only">
          {SENTIMENT_SCORE_HINT}
        </span>
        {query.isPending ? <SentimentSkeleton /> : null}
        {query.isError ? (
          <div role="alert">
            <p className="text-sm">Could not load sentiment.</p>
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {query.isSuccess ? (
          <SentimentScore
            summary={query.data.summary}
            comparison={query.data.comparison}
          />
        ) : null}
        {isScanning ? (
          <p className="text-muted-foreground text-xs" role="status">
            Scan in progress
          </p>
        ) : null}
        <SentimentTrendCard
          points={query.isSuccess ? query.data.points : undefined}
          comparison={query.isSuccess ? query.data.comparison : undefined}
          isPending={query.isPending}
          isError={query.isError}
          isScanning={isScanning}
        />
      </InstrumentModule>
      <InstrumentModule
        eyebrow="Mention distribution"
        variant="table"
        className="h-full lg:col-span-5"
        bodyClassName="flex flex-col gap-5"
      >
        {query.isPending ? <SentimentSkeleton compact /> : null}
        {query.isSuccess ? (
          <SentimentDistribution summary={query.data.summary} />
        ) : null}
        {query.isSuccess ? (
          <SentimentFamilyList engines={query.data.engines} />
        ) : null}
      </InstrumentModule>
      <SentimentThemes organizationId={organizationId} />
    </InstrumentGrid>
  );
}

function SentimentSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading sentiment">
      <Skeleton className={compact ? "h-8 w-full" : "h-20 w-32"} />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className={compact ? "h-3 w-full" : "h-48 w-full"} />
    </div>
  );
}

function SentimentDistribution({
  summary,
}: {
  summary: import("@/types/geo-sentiment").SentimentScoreProps["summary"];
}) {
  const total = summary.classifiedMentions;
  return (
    <div className="space-y-3">
      <div
        className="flex h-3 overflow-hidden rounded-full"
        aria-label="Sentiment distribution"
      >
        {(["positive", "neutral", "negative"] as const).map((polarity) => (
          <span
            key={polarity}
            className={`h-full ${polarity === "positive" ? "bg-emerald-500" : polarity === "neutral" ? "bg-amber-400" : "bg-rose-500"}`}
            style={{
              width: `${total ? (summary[polarity] / total) * 100 : 0}%`,
            }}
          />
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        {(["positive", "neutral", "negative"] as const).map((polarity) => (
          <div key={polarity}>
            <dt className="text-muted-foreground capitalize">{polarity}</dt>
            <dd className="font-medium tabular-nums">
              {total ? Math.round((summary[polarity] / total) * 100) : 0}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
