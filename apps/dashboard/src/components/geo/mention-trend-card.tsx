"use client";

import {
  GEO_MENTION_ACTIVITY_LABEL,
  GEO_MENTION_TREND_LINE_KEY,
  GEO_MENTION_TREND_LINE_LABEL,
  GEO_MENTION_TREND_TOTAL_KEY,
  GEO_MENTION_TREND_TOTAL_LABEL,
} from "@notra/geo-core/constants/geo";
import type { MentionTrendRow } from "@notra/geo-core/types/geo";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { useState } from "react";

import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { MentionTrendAgentsPicker } from "@/components/geo/mention-trend-agents";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { CHART_MUTED_COLOR, CHART_PRIMARY_COLOR } from "@/constants/charts";
import type { ChartConfig } from "@/types/charts";
import type { MentionTrendCardProps, MentionTrendSeries } from "@/types/geo";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import { accountSeriesColors, seriesColors } from "@/utils/chart-colors";
import { chartKey } from "@/utils/chart-keys";
import { engineIconHtml } from "@/utils/engine-icon-html";
import {
  buildMentionTrendRows,
  fitMentionTrendLine,
  formatChartInteger,
  mentionTrendEmptyLabel,
} from "@/utils/geo-charts";

const TOTAL_STROKE_WIDTH = 2;
const ENGINE_STROKE_WIDTH = 1.5;
const TREND_STROKE_WIDTH = 1.5;

function mentionTrendSeries(engines: readonly string[]): MentionTrendSeries[] {
  return engines.map((engine) => ({
    key: chartKey(engine),
    engine,
    label: engineFamilyLabel(engine),
  }));
}

function sampledDayCount(
  rows: readonly MentionTrendRow[],
  engines: readonly string[]
): number {
  return rows.filter((row) =>
    engines.some((engine) => typeof row[chartKey(engine)] === "number")
  ).length;
}

function hasIncompleteTail(rows: readonly MentionTrendRow[]): boolean {
  return rows.at(-1)?.rawDay === todayIsoDate();
}

function toggleActiveSeries(
  activeKeys: ReadonlySet<string>,
  key: string
): Set<string> {
  const next = new Set(activeKeys);
  if (next.delete(key)) {
    return next;
  }
  next.add(key);
  return next;
}

export function MentionTrendCard({
  points,
  isScanning = false,
}: MentionTrendCardProps) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(() => new Set());

  const { rows, engines } = buildMentionTrendRows(points);
  const series = mentionTrendSeries(engines).filter((entry) =>
    rows.some((row) => {
      const value = row[entry.key];
      return typeof value === "number" && value > 0;
    })
  );
  const allKeys = engines.map(chartKey);
  const visibleKeys = series.map((entry) => entry.key);
  const observedRows = rows.map((row) =>
    allKeys.some((key) => typeof row[key] === "number")
      ? row
      : { ...row, [GEO_MENTION_TREND_TOTAL_KEY]: null }
  );
  const trend = fitMentionTrendLine(observedRows, GEO_MENTION_TREND_TOTAL_KEY);
  const chartRows = rows.map((row, index) => {
    const trendValue = trend[index];
    return typeof trendValue === "number"
      ? { ...row, [GEO_MENTION_TREND_LINE_KEY]: trendValue }
      : row;
  });
  const config: ChartConfig = {
    [GEO_MENTION_TREND_TOTAL_KEY]: {
      label: GEO_MENTION_TREND_TOTAL_LABEL,
      colors: seriesColors(CHART_PRIMARY_COLOR),
    },
    [GEO_MENTION_TREND_LINE_KEY]: {
      label: GEO_MENTION_TREND_LINE_LABEL,
      colors: seriesColors(CHART_MUTED_COLOR),
    },
  };
  for (const [index, entry] of series.entries()) {
    config[entry.key] = {
      label: entry.label,
      colors: accountSeriesColors(index),
      indicatorHtml: engineIconHtml(entry.engine, false),
    };
  }
  const markIncompleteTail = hasIncompleteTail(rows);
  const sampledDays = sampledDayCount(rows, engines);

  const handleToggle = (key: string) => {
    setActiveKeys((previous) => toggleActiveSeries(previous, key));
  };

  const emptyMessage =
    sampledDays === 0
      ? geoScanEmptyMessage(isScanning, "Run a scan to see your mention trend")
      : null;

  return (
    <InstrumentModule
      action={
        <MentionTrendAgentsPicker
          activeKeys={activeKeys}
          disabled={emptyMessage !== null}
          onToggle={handleToggle}
          series={series}
        />
      }
      bodyClassName="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4"
      className="h-full"
      eyebrow={GEO_MENTION_ACTIVITY_LABEL}
      variant="table"
    >
      {emptyMessage ? (
        <InstrumentEmpty
          busy={isScanning}
          className="min-h-64 flex-1"
          message={emptyMessage}
          preview={<EmptyStateTrendPreview />}
          seed="Mention activity"
        />
      ) : (
        <EChartsAreaChart
          animation={false}
          className="min-h-64 w-full flex-1"
          config={config}
          curveType="monotone"
          data={chartRows}
          xDataKey="day"
        >
          <EChartsAreaChart.Grid variant="solid" />
          <EChartsAreaChart.XAxis dataKey="day" />
          <EChartsAreaChart.YAxis scale />
          <EChartsAreaChart.Area
            dataKey={GEO_MENTION_TREND_TOTAL_KEY}
            enableBufferLine={markIncompleteTail}
            gapMissing
            strokeVariant="solid"
            strokeWidth={TOTAL_STROKE_WIDTH}
            variant="gradient"
          >
            <EChartsAreaChart.ActiveDot variant="border" />
          </EChartsAreaChart.Area>
          {series.map((entry) =>
            activeKeys.has(entry.key) ? (
              <EChartsAreaChart.Area
                dataKey={entry.key}
                connectNulls
                enableBufferLine={markIncompleteTail}
                gapMissing
                key={entry.key}
                strokeVariant="solid"
                strokeWidth={ENGINE_STROKE_WIDTH}
                variant="none"
              >
                <EChartsAreaChart.ActiveDot variant="border" />
              </EChartsAreaChart.Area>
            ) : null
          )}
          <EChartsAreaChart.Area
            curveType="linear"
            dataKey={GEO_MENTION_TREND_LINE_KEY}
            gapMissing
            strokeVariant="dashed"
            strokeWidth={TREND_STROKE_WIDTH}
            variant="none"
          />
          <EChartsAreaChart.Tooltip
            confine={false}
            emptyLabel={(row) => mentionTrendEmptyLabel(row, allKeys)}
            labelFormatter={formatFullDayLabel}
            labelKey="rawDay"
            layout="activity"
            position="fixed"
            roundness="xl"
            rowKeys={visibleKeys}
            valueFormatter={formatChartInteger}
          />
        </EChartsAreaChart>
      )}
    </InstrumentModule>
  );
}
