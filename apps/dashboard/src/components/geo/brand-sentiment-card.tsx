"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useId } from "react";

import { SentimentFamilyList } from "@/components/geo/sentiment-family-list";
import { SentimentTrendCard } from "@/components/geo/sentiment-trend-card";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_SCORE_FORMAT,
  SENTIMENT_SCORE_HINT,
} from "@/constants/geo-sentiment";
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
        className="h-full lg:col-span-5"
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
        {query.isPending ? (
          <p className="text-muted-foreground text-sm" role="status">
            Loading sentiment…
          </p>
        ) : null}
        {query.isError ? (
          <div role="alert">
            <p className="text-sm">Could not load sentiment.</p>
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {query.isSuccess ? (
          <>
            <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
              {query.data.summary.score === null
                ? "—"
                : SENTIMENT_SCORE_FORMAT.format(query.data.summary.score)}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                / 100
              </span>
            </p>
            {query.data.summary.score === null ? (
              <p className="text-muted-foreground text-sm">
                No rated mentions in this period.
              </p>
            ) : null}
            <SentimentFamilyList engines={query.data.engines} />
          </>
        ) : null}
        {isScanning ? (
          <p className="text-muted-foreground text-xs" role="status">
            Scan in progress
          </p>
        ) : null}
      </InstrumentModule>
      <SentimentTrendCard
        points={query.isSuccess ? query.data.points : undefined}
        isPending={query.isPending}
        isError={query.isError}
        isScanning={isScanning}
      />
    </InstrumentGrid>
  );
}
