import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";

import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import { InstrumentEmpty } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_CHART_CONFIG,
  SENTIMENT_SCORE_FORMAT,
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
  sentimentEmptyMessage,
} from "@/utils/geo-sentiment";
import { sentimentTailEstimate } from "@/utils/sentiment-estimate";

export function SentimentTrendCard({
  points,
  comparison,
  isPending,
  isError,
  isScanning,
  summary,
  retry,
}: SentimentTrendCardProps) {
  return (
    <div
      className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3"
      aria-label="Sentiment history"
    >
      <SentimentTrendContent
        points={points}
        comparison={comparison}
        summary={summary}
        isPending={isPending}
        isError={isError}
        isScanning={isScanning}
        retry={retry}
        showCurrent
        showPrevious={false}
      />
    </div>
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
          className="h-40 min-h-40 [&_p]:normal-case"
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
  const estimates = sentimentTailEstimate(points);
  const hasEstimate = showCurrent && estimates.some((value) => value !== null);
  return (
    <EChartsAreaChart
      animation={false}
      className="h-40 min-h-40 w-full"
      config={SENTIMENT_CHART_CONFIG}
      curveType="monotoneX"
      enableHoverHighlight={false}
      enableHoverReveal={false}
      data={sentimentComparisonData({
        points,
        comparison,
        showCurrent,
        showPrevious,
      }).map((row, index) => ({
        ...row,
        estimate: showCurrent ? (estimates[index] ?? null) : null,
      }))}
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
      {hasEstimate ? (
        <EChartsAreaChart.Area
          dataKey="estimate"
          curveType="linear"
          gapMissing
          connectNulls={false}
          enableBufferLine={false}
          strokeVariant="dashed"
          strokeWidth={2}
          variant="none"
        />
      ) : null}
      <EChartsAreaChart.Tooltip
        hideZeros={false}
        labelKey="day"
        labelFormatter={formatDayLabel}
        valueFormatter={(value) =>
          `${SENTIMENT_SCORE_FORMAT.format(value)} / 100`
        }
      />
    </EChartsAreaChart>
  );
}
