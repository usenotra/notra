import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { Button } from "@notra/ui/components/ui/button";
import { useLocale, useTranslations } from "next-intl";

import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { SentimentSkeleton } from "@/components/geo/sentiment-skeleton";
import { InstrumentEmpty } from "@/components/instrument/instrument-module";
import {
  GEO_SENTIMENT_EMPTY_LABEL_KEYS,
  SENTIMENT_CHART_CONFIG,
  SENTIMENT_SCORE_FORMAT,
} from "@/constants/geo-sentiment";
import type { ChartConfig } from "@/types/charts";
import type {
  SentimentTrendCardProps,
  SentimentTrendPlotProps,
} from "@/types/geo-sentiment";
import {
  isolatedSentimentPointIndices,
  sentimentEmptyMessageKey,
  sentimentSummaryShowsEmpty,
} from "@/utils/geo-sentiment";
import {
  sentimentNoDataBaseline,
  sentimentTailEstimate,
} from "@/utils/sentiment-estimate";

export function SentimentTrendCard({
  points,
  isPending,
  isError,
  isScanning,
  summary,
  retry,
}: SentimentTrendCardProps) {
  const t = useTranslations("geo.sentimentTrendCard");
  return (
    <div
      className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3"
      aria-label={t("label")}
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
  const t = useTranslations("geo.sentimentTrendCard");
  const tGeoShared = useTranslations("geo.shared");
  if (isPending) {
    return <SentimentSkeleton />;
  }
  if (isError) {
    return (
      <div role="alert" className="space-y-2 py-4 text-sm">
        <p>{t("loadError")}</p>
        <Button size="sm" variant="ghost" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  const summaryShowsEmpty = sentimentSummaryShowsEmpty(summary);
  let content;
  if (points) {
    content = <SentimentTrendPlot points={points} />;
  } else if (summaryShowsEmpty && !isScanning) {
    content = (
      <div
        aria-hidden="true"
        className="relative h-40 min-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_24%,black_70%,transparent_100%)] opacity-30"
      >
        <EmptyStateTrendPreview />
      </div>
    );
  } else {
    content = (
      <InstrumentEmpty
        seed="Sentiment trend"
        className="h-40 min-h-40 [&_p]:normal-case"
        busy={isScanning}
        message={
          isScanning
            ? tGeoShared("scanInProgress")
            : tGeoShared(
                GEO_SENTIMENT_EMPTY_LABEL_KEYS[
                  sentimentEmptyMessageKey(summary)
                ]
              )
        }
        preview={<EmptyStateTrendPreview />}
      />
    );
  }
  return (
    <>
      {content}
      {isScanning && points ? (
        <p role="status" className="text-muted-foreground text-xs">
          {tGeoShared("scanInProgress")}
        </p>
      ) : null}
    </>
  );
}

function SentimentTrendPlot({ points }: SentimentTrendPlotProps) {
  const t = useTranslations("geo.sentimentTrendCard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const config: ChartConfig = {
    score: { ...SENTIMENT_CHART_CONFIG.score, label: t("chart.score") },
    previous: {
      ...SENTIMENT_CHART_CONFIG.previous,
      label: t("chart.previous"),
    },
    estimate: {
      ...SENTIMENT_CHART_CONFIG.estimate,
      label: t("chart.estimate"),
    },
    noData: {
      ...SENTIMENT_CHART_CONFIG.noData,
      label: tCommon("labels.noData"),
    },
  };
  const estimates = sentimentTailEstimate(points);
  const noDataBaseline = sentimentNoDataBaseline(points, estimates);
  const hasEstimate = estimates.some((value) => value !== null);
  return (
    <EChartsAreaChart
      animation={false}
      className="h-40 min-h-40 w-full"
      config={config}
      curveType="monotoneX"
      enableHoverHighlight={false}
      enableHoverReveal={false}
      data={points.map(({ day, score }, index) => ({
        day,
        score,
        estimate: estimates[index] ?? null,
        noData: noDataBaseline[index] ?? null,
      }))}
      xDataKey="day"
    >
      <EChartsAreaChart.Grid variant="solid" />
      <EChartsAreaChart.YAxis min={0} max={100} interval={50} hideDots />
      <EChartsAreaChart.XAxis
        dataKey="day"
        hideDots
        tickFormatter={(day: string) => formatDayLabel(day, locale)}
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
        <EChartsAreaChart.Dot indices={isolatedSentimentPointIndices(points)} />
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
      <EChartsAreaChart.Area
        dataKey="noData"
        curveType="linear"
        gapMissing
        connectNulls={false}
        enableBufferLine={false}
        strokeVariant="solid"
        strokeWidth={1}
        variant="none"
      />
      <EChartsAreaChart.Tooltip
        excludeKeys={["noData"]}
        hideZeros={false}
        labelKey="day"
        labelFormatter={(day: string) => formatDayLabel(day, locale)}
        valueFormatter={(value) =>
          `${SENTIMENT_SCORE_FORMAT.format(value)} / 100`
        }
      />
    </EChartsAreaChart>
  );
}
