import { ArrowUpDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_FILTER_TRIGGER_CLASS } from "@notra/geo-core/constants/geo";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@notra/ui/components/ui/dropdown-menu";
import { useState } from "react";

import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { SentimentScore } from "@/components/geo/sentiment-score";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import {
  SENTIMENT_CHART_CONFIG,
  SENTIMENT_SCORE_FORMAT,
  SENTIMENT_SCORE_HINT,
} from "@/constants/geo-sentiment";
import type {
  SentimentTrendCardProps,
  SentimentTrendPlotProps,
  SentimentTrendContentProps,
} from "@/types/geo-sentiment";
import {
  hasIsolatedSentimentPoint,
  sentimentTrendState,
  sentimentComparisonData,
  sentimentComparisonLabel,
  sentimentEmptyMessage,
} from "@/utils/geo-sentiment";

export function SentimentTrendCard({
  points,
  comparison,
  isPending,
  isError,
  isScanning,
  summary,
  retry,
}: SentimentTrendCardProps) {
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPrevious, setShowPrevious] = useState(true);
  const { hasRatings } = sentimentTrendState({
    points,
    comparison,
    isPending,
    isError,
    isScanning,
  });
  const ready = !isPending && !isError;
  return (
    <InstrumentModule
      eyebrow="Brand sentiment"
      variant="table"
      className="lg:col-span-7"
      bodyClassName="gap-3 px-4 pt-1 pb-4"
      hint={SENTIMENT_SCORE_HINT}
      action={
        ready && hasRatings ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={GEO_FILTER_TRIGGER_CLASS}
              aria-label="Visible sentiment periods"
            >
              <span>Periods</span>
              <HugeiconsIcon icon={ArrowUpDownIcon} size={12} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Show sentiment scores</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={showCurrent}
                  onCheckedChange={setShowCurrent}
                >
                  <span
                    aria-hidden="true"
                    className="bg-geo-search size-2 rounded-full"
                  />
                  Current period
                </DropdownMenuCheckboxItem>
                {comparison ? (
                  <DropdownMenuCheckboxItem
                    checked={showPrevious}
                    onCheckedChange={setShowPrevious}
                  >
                    <span
                      aria-hidden="true"
                      className="bg-geo-memory size-2 rounded-full"
                    />
                    Previous period
                  </DropdownMenuCheckboxItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      <SentimentTrendContent
        points={points}
        comparison={comparison}
        summary={summary}
        isPending={isPending}
        isError={isError}
        isScanning={isScanning}
        retry={retry}
        showCurrent={showCurrent}
        showPrevious={showPrevious}
      />
    </InstrumentModule>
  );
}

function SentimentTrendContent(props: SentimentTrendContentProps) {
  const {
    isPending,
    isError,
    retry,
    summary,
    comparison,
    points,
    isScanning,
    showCurrent,
    showPrevious,
  } = props;
  if (isPending) {
    return <SentimentSkeleton />;
  }
  if (isError) {
    return (
      <div role="alert" className="space-y-2 py-4 text-sm">
        <p>Could not load sentiment.</p>
        <Button size="sm" variant="ghost" onClick={retry}>
          Retry sentiment
        </Button>
      </div>
    );
  }
  const { hasRatings } = sentimentTrendState(props);
  return (
    <>
      {summary ? (
        <SentimentScore summary={summary} comparison={comparison} />
      ) : null}
      {hasRatings && points ? (
        <SentimentTrendPlot
          points={points}
          comparison={comparison}
          showCurrent={showCurrent}
          showPrevious={showPrevious}
        />
      ) : (
        <InstrumentEmpty
          seed="Sentiment trend"
          className="h-64 min-h-64 [&_p]:normal-case"
          busy={isScanning}
          message={
            isScanning ? "Scan in progress" : sentimentEmptyMessage(summary)
          }
          preview={<EmptyStateTrendPreview />}
        />
      )}
      {isScanning && hasRatings ? (
        <p role="status" className="text-muted-foreground text-xs">
          Scan in progress
        </p>
      ) : null}
    </>
  );
}

function SentimentTrendPlot({
  points,
  comparison,
  showCurrent,
  showPrevious,
}: SentimentTrendPlotProps) {
  return (
    <EChartsAreaChart
      animation={false}
      className="h-64 min-h-64 w-full"
      config={SENTIMENT_CHART_CONFIG}
      curveType="monotoneX"
      enableHoverHighlight={false}
      enableHoverReveal={false}
      data={sentimentComparisonData({
        points,
        comparison,
        showCurrent,
        showPrevious,
      })}
      xDataKey="day"
    >
      <EChartsAreaChart.Grid variant="solid" />
      <EChartsAreaChart.YAxis min={0} max={100} interval={50} hideDots />
      <EChartsAreaChart.XAxis
        dataKey="day"
        hideDots
        tickFormatter={formatDayLabel}
      />
      {showCurrent ? (
        <EChartsAreaChart.Area
          dataKey="score"
          gapMissing
          connectNulls={false}
          enableBufferLine={false}
          strokeVariant="solid"
          strokeWidth={2}
          variant="gradient"
        >
          {hasIsolatedSentimentPoint(points) ? <EChartsAreaChart.Dot /> : null}
        </EChartsAreaChart.Area>
      ) : null}
      {comparison && showPrevious ? (
        <EChartsAreaChart.Area
          dataKey="previous"
          gapMissing
          connectNulls={false}
          enableBufferLine={false}
          strokeVariant="solid"
          strokeWidth={2}
          variant="none"
        >
          {hasIsolatedSentimentPoint(comparison.points) ? (
            <EChartsAreaChart.Dot />
          ) : null}
        </EChartsAreaChart.Area>
      ) : null}
      <EChartsAreaChart.Tooltip
        hideZeros={false}
        labelKey="day"
        labelFormatter={(day) =>
          sentimentComparisonLabel(day, points, comparison)
        }
        valueFormatter={(value) =>
          `${SENTIMENT_SCORE_FORMAT.format(value)} / 100`
        }
      />
    </EChartsAreaChart>
  );
}
