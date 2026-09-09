"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useId } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { SentimentFamilyList } from "@/components/geo/sentiment-family-list";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_CHART_CONFIG,
  SENTIMENT_CHART_OPTIONS,
  SENTIMENT_SCORE_FORMAT,
  SENTIMENT_SCORE_HINT,
} from "@/constants/geo-sentiment";
import { useGeoSentiment } from "@/lib/hooks/use-geo-sentiment";
import type { BrandSentimentCardProps } from "@/types/geo-sentiment";
import { hasIsolatedSentimentPoint } from "@/utils/geo-sentiment";

export function BrandSentimentCard({
  organizationId,
  isScanning,
}: BrandSentimentCardProps) {
  const query = useGeoSentiment(organizationId);
  const descriptionId = useId();
  return (
    <InstrumentSection
      eyebrow="Brand sentiment"
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
      bodyClassName="flex flex-col gap-6"
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
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-6">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Overall score</p>
              <p className="text-3xl font-medium tabular-nums">
                {query.data.summary.score === null
                  ? "—"
                  : SENTIMENT_SCORE_FORMAT.format(
                      query.data.summary.score
                    )}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  / 100
                </span>
              </p>
            </div>
            {query.data.summary.score === null ? (
              <p className="text-muted-foreground text-sm">
                No rated mentions in this period.
              </p>
            ) : (
              <EChartsAreaChart
                animation={false}
                className="h-36 w-full"
                config={SENTIMENT_CHART_CONFIG}
                chartOptions={SENTIMENT_CHART_OPTIONS}
                curveType="linear"
                enableHoverHighlight={false}
                enableHoverReveal={false}
                data={query.data.points.map(({ day, score }) => ({
                  day,
                  score,
                }))}
                xDataKey="day"
              >
                <EChartsAreaChart.XAxis
                  dataKey="day"
                  hideDots
                  tickFormatter={formatDayLabel}
                />
                <EChartsAreaChart.Area
                  dataKey="score"
                  gapMissing
                  connectNulls={false}
                  enableBufferLine={false}
                  strokeVariant="solid"
                  strokeWidth={2}
                  variant="none"
                >
                  {hasIsolatedSentimentPoint(query.data.points) ? (
                    <EChartsAreaChart.Dot />
                  ) : null}
                </EChartsAreaChart.Area>
                <EChartsAreaChart.Tooltip
                  hideZeros={false}
                  labelKey="day"
                  valueFormatter={(value) =>
                    `${SENTIMENT_SCORE_FORMAT.format(value)} / 100`
                  }
                />
              </EChartsAreaChart>
            )}
          </div>
          <SentimentFamilyList engines={query.data.engines} />
        </>
      ) : null}
      {isScanning ? (
        <p className="text-muted-foreground text-xs" role="status">
          Scan in progress
        </p>
      ) : null}
    </InstrumentSection>
  );
}
