import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";
import { useState } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
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
  sentimentTrendState,
  sentimentComparisonData,
  sentimentComparisonLabel,
} from "@/utils/geo-sentiment";

export function SentimentTrendCard({
  points,
  comparison,
  isPending,
  isError,
  isScanning,
}: SentimentTrendCardProps) {
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPrevious, setShowPrevious] = useState(true);
  const { message, hasRatings } = sentimentTrendState({
    points,
    comparison,
    isPending,
    isError,
    isScanning,
  });
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div
        className="flex flex-wrap gap-2"
        aria-label="Visible sentiment periods"
      >
        <Button
          size="sm"
          variant={showCurrent ? "secondary" : "ghost"}
          aria-pressed={showCurrent}
          onClick={() => setShowCurrent((value) => !value)}
        >
          <span
            aria-hidden="true"
            className="bg-geo-search size-2 rounded-full"
          />
          Current period
        </Button>
        {comparison ? (
          <Button
            size="sm"
            variant={showPrevious ? "secondary" : "ghost"}
            aria-pressed={showPrevious}
            onClick={() => setShowPrevious((value) => !value)}
          >
            <span
              aria-hidden="true"
              className="bg-geo-memory size-2 rounded-full"
            />
            Previous period
          </Button>
        ) : null}
      </div>
      {comparison ? (
        <p className="text-muted-foreground text-xs">
          Current: {comparison.current.from} – {comparison.current.to}
          <br />
          Previous: {comparison.previous.from} – {comparison.previous.to} · UTC
        </p>
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
          className="min-h-64 flex-1"
          busy={isPending || isScanning}
          message={message}
          seed="Sentiment trend"
        />
      )}
    </div>
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
      className="min-h-64 w-full flex-1"
      config={SENTIMENT_CHART_CONFIG}
      curveType="linear"
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
      <EChartsAreaChart.Area
        dataKey="score"
        gapMissing
        connectNulls={false}
        enableBufferLine={false}
        strokeVariant="solid"
        strokeWidth={2}
        variant="none"
      >
        {hasIsolatedSentimentPoint(points) ? <EChartsAreaChart.Dot /> : null}
      </EChartsAreaChart.Area>
      {comparison ? (
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
