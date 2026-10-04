"use client";

import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { SentimentEngineList } from "@/components/geo/sentiment-engine-list";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import {
  SENTIMENT_MIX_COLORS,
  SENTIMENT_POLARITIES,
  SENTIMENT_POLARITY_STYLES,
  SENTIMENT_SCORE_FORMAT,
} from "@/constants/geo-sentiment";
import type { SentimentBreakdownProps } from "@/types/geo-sentiment";
import {
  sentimentFamilyBuckets,
  sentimentScoreBand,
} from "@/utils/geo-sentiment";

export function SentimentBreakdown({
  data,
  isScanning,
}: SentimentBreakdownProps) {
  const t = useTranslations("geo.sentimentBreakdown");
  const tCommon = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  const tScore = useTranslations("geo.brandSentimentCard");
  const format = useFormatter();
  const locale = useLocale();
  const { summary, comparison, points, engines } = data;
  const families = sentimentFamilyBuckets(engines);
  const rows = points.map(
    ({ day, positiveShare, neutralShare, negativeShare }) => ({
      day,
      positive: (positiveShare ?? 0) * 100,
      neutral: (neutralShare ?? 0) * 100,
      negative: (negativeShare ?? 0) * 100,
    })
  );
  const formatShare = (share: number | null) =>
    share === null
      ? "—"
      : format.number(share, {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 @min-[44rem]/main:grid-cols-12">
      <InstrumentModule
        bodyClassName="flex min-h-0 flex-1 flex-col gap-4 px-5 pt-4 pb-4"
        className="h-full @min-[44rem]/main:col-span-7"
        eyebrow={t("eyebrow")}
        hint={tScore("scoreHint")}
        readout={isScanning ? tGeoShared("scanInProgress") : undefined}
        variant="table"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <p className="flex items-baseline gap-1.5 text-4xl leading-none font-semibold tracking-tight tabular-nums">
              {summary.score === null
                ? "—"
                : SENTIMENT_SCORE_FORMAT.format(summary.score)}
              <span className="text-muted-foreground text-sm font-normal">
                / 100
              </span>
            </p>
            <div className="flex flex-col gap-1.5">
              <GeoStatDelta
                delta={comparison?.delta ?? null}
                hint={t("deltaHint")}
                kind="score"
                label={t("deltaLabel")}
              />
              {summary.score === null ? null : (
                <span className="text-muted-foreground text-xs">
                  {t(`band.${sentimentScoreBand(summary.score)}`)}
                </span>
              )}
            </div>
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {SENTIMENT_POLARITIES.map((polarity) => (
              <li className="flex items-center gap-1.5" key={polarity}>
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${SENTIMENT_POLARITY_STYLES[polarity].fill}`}
                />
                <span className="text-muted-foreground">
                  {tCommon(polarity)}
                </span>
                <span className="font-medium tabular-nums">
                  {formatShare(summary[`${polarity}Share`])}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <EChartsBarChart
          animation={false}
          barCategoryGap={4}
          className="h-56 w-full cursor-crosshair"
          config={{
            positive: {
              label: tCommon("positive"),
              colors: SENTIMENT_MIX_COLORS.positive,
            },
            neutral: {
              label: tCommon("neutral"),
              colors: SENTIMENT_MIX_COLORS.neutral,
            },
            negative: {
              label: tCommon("negative"),
              colors: SENTIMENT_MIX_COLORS.negative,
            },
          }}
          data={rows}
          stackType="percent"
          xDataKey="day"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis
            hideDots
            tickFormatter={(day) => formatDayLabel(day, locale)}
          />
          <EChartsBarChart.YAxis
            hideDots
            tickFormatter={(value) => `${value}%`}
          />
          <EChartsBarChart.Bar dataKey="positive" radius={2} />
          <EChartsBarChart.Bar dataKey="neutral" radius={2} />
          <EChartsBarChart.Bar dataKey="negative" radius={2} />
          <EChartsBarChart.Tooltip
            roundness="xl"
            valueFormatter={(value) => `${Number(value).toFixed(1)}%`}
          />
        </EChartsBarChart>
      </InstrumentModule>
      <SentimentEngineList families={families} />
    </div>
  );
}
