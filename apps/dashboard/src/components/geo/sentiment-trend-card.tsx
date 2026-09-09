import { formatDayLabel } from "@notra/geo-core/utils/day-label";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import {
  SENTIMENT_CHART_CONFIG,
  SENTIMENT_SCORE_FORMAT,
} from "@/constants/geo-sentiment";
import type { SentimentTrendCardProps } from "@/types/geo-sentiment";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import { hasIsolatedSentimentPoint } from "@/utils/geo-sentiment";

export function SentimentTrendCard({
  points,
  isPending,
  isError,
  isScanning,
}: SentimentTrendCardProps) {
  const hasRatings = points?.some(({ score }) => score !== null);
  let emptyMessage = "No rated mentions in this period.";
  if (isPending) {
    emptyMessage = "Loading sentiment…";
  }
  if (isError) {
    emptyMessage = "Could not load sentiment.";
  }
  return (
    <InstrumentModule
      eyebrow="Sentiment trend"
      variant="table"
      className="h-full lg:col-span-7"
      bodyClassName="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4"
    >
      {hasRatings && points ? (
        <EChartsAreaChart
          animation={false}
          className="min-h-64 w-full flex-1"
          config={SENTIMENT_CHART_CONFIG}
          curveType="linear"
          enableHoverHighlight={false}
          enableHoverReveal={false}
          data={points.map(({ day, score }) => ({ day, score }))}
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
            variant="none"
          >
            {hasIsolatedSentimentPoint(points) ? (
              <EChartsAreaChart.Dot />
            ) : null}
          </EChartsAreaChart.Area>
          <EChartsAreaChart.Tooltip
            hideZeros={false}
            labelKey="day"
            labelFormatter={formatFullDayLabel}
            valueFormatter={(value) =>
              `${SENTIMENT_SCORE_FORMAT.format(value)} / 100`
            }
          />
        </EChartsAreaChart>
      ) : (
        <InstrumentEmpty
          className="min-h-64 flex-1"
          busy={isPending || isScanning}
          message={emptyMessage}
          seed="Sentiment trend"
        />
      )}
    </InstrumentModule>
  );
}
