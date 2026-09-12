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
} from "@/types/geo-sentiment";
import {
  hasIsolatedSentimentPoint,
  sentimentEmptyMessage,
} from "@/utils/geo-sentiment";
import { sentimentTailEstimate } from "@/utils/sentiment-estimate";

export function SentimentTrendCard({
  points,
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
        summary={summary}
        isPending={isPending}
        isError={isError}
        isScanning={isScanning}
        retry={retry}
      />
    </div>
  );
}

function SentimentTrendContent(props: SentimentTrendCardProps) {
  const { isPending, isError, retry, summary, points, isScanning } = props;
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
  const hasRatings = points?.some((point) => point.score !== null) ?? false;
  return (
    <>
      {hasRatings && points ? (
        <SentimentTrendPlot points={points} />
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

function SentimentTrendPlot({ points }: SentimentTrendPlotProps) {
  const estimates = sentimentTailEstimate(points);
  const hasEstimate = estimates.some((value) => value !== null);
  return (
    <EChartsAreaChart
      animation={false}
      className="h-40 min-h-40 w-full"
      config={SENTIMENT_CHART_CONFIG}
      curveType="monotoneX"
      enableHoverHighlight={false}
      enableHoverReveal={false}
      data={points.map(({ day, score }, index) => ({
        day,
        score,
        estimate: estimates[index] ?? null,
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
