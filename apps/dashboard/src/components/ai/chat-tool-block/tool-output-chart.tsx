"use client";

import type {
  AreaChartArtifact,
  BarChartArtifact,
  ChartArtifact,
  PieChartArtifact,
} from "@notra/ai/types/chart-artifact";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import { EngineIcon } from "@/components/geo/engine-icon";
import {
  CHAT_TOOL_CHART_HEIGHT_CLASS,
  CHAT_TOOL_CHART_OPTIONS,
  CHAT_TOOL_RANK_TRACK_CLASS,
  CHART_SEARCH_FILL_CLASS,
  DONUT_CORNER_RADIUS,
  DONUT_INNER_RADIUS,
  DONUT_OUTER_RADIUS,
  DONUT_PADDING_ANGLE,
} from "@/constants/charts";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types/charts";
import type {
  ToolOutputChartProps,
  ToolOutputRankRow,
} from "@/types/components/chat-tool-chart";
import { accountSeriesColors } from "@/utils/chart-colors";
import {
  CHART_CATEGORY_KEY,
  chartSeriesDataKey,
  pivotChartSeries,
  rankBarChartSegments,
} from "@/utils/chat-tool-chart";
import { formatChartEngineLabel } from "@/utils/geo-model-display";

const VALUE_KEY = "value";

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border bg-muted/20 mt-3 overflow-hidden rounded-lg border">
      <div className="px-3 pt-2.5 pb-1 wrap-anywhere">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {subtitle ? (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <p className="text-muted-foreground px-3 pt-1 pb-3 text-xs leading-5">
      {message}
    </p>
  );
}

function AreaArtifactChart({ chart }: { chart: AreaChartArtifact }) {
  const t = useTranslations("ai.toolBlock");
  const series = chart.series;
  const data = pivotChartSeries(series);
  const keyedSeries = series.map((entry, index) => ({
    dataKey: chartSeriesDataKey(entry.name, index),
    label: formatChartEngineLabel(entry.name),
  }));
  const config: ChartConfig = {};
  for (const [index, entry] of keyedSeries.entries()) {
    config[entry.dataKey] = {
      label: entry.label,
      colors: accountSeriesColors(index),
    };
  }

  if (data.length === 0) {
    return <EmptyChartMessage message={t("chartEmptySeries")} />;
  }

  return (
    <EChartsAreaChart
      animation={false}
      chartOptions={CHAT_TOOL_CHART_OPTIONS}
      className={cn("w-full px-1 pb-1", CHAT_TOOL_CHART_HEIGHT_CLASS)}
      config={config}
      curveType="monotone"
      data={data}
      xDataKey={CHART_CATEGORY_KEY}
    >
      {keyedSeries.map((entry) => (
        <EChartsAreaChart.Area
          dataKey={entry.dataKey}
          gapMissing
          key={entry.dataKey}
          strokeVariant="solid"
          variant="gradient"
        />
      ))}
      <EChartsAreaChart.Tooltip confine={false} />
    </EChartsAreaChart>
  );
}

function RankMeter({ row }: { row: ToolOutputRankRow }) {
  return (
    <li className="flex items-center gap-2">
      <EngineIcon className="size-4" engine={row.engine} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium">{row.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {row.valueLabel}
          </span>
        </div>
        <div
          aria-label={`${row.name} ${row.valueLabel}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(row.widthPercent)}
          className={cn(
            "mt-1 h-1.5 overflow-hidden rounded-full",
            CHAT_TOOL_RANK_TRACK_CLASS
          )}
          role="meter"
        >
          <div
            className={cn("h-full rounded-full", CHART_SEARCH_FILL_CLASS)}
            style={{ width: `${row.widthPercent}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function BarArtifactChart({ chart }: { chart: BarChartArtifact }) {
  const tMode = useTranslations("geo.shared.engineMode");
  const locale = useLocale();
  const rows = rankBarChartSegments(
    chart.segments,
    (engine) => tMode("engineWithoutSearch", { engine }),
    locale
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2 px-3 pt-1 pb-3">
      {rows.map((row) => (
        <RankMeter key={row.engine} row={row} />
      ))}
    </ul>
  );
}

function PieArtifactChart({ chart }: { chart: PieChartArtifact }) {
  const segments = chart.segments;
  const data = segments.map((segment) => ({
    name: segment.label,
    [VALUE_KEY]: segment.value,
  }));
  const config: ChartConfig = {};
  for (const [index, segment] of segments.entries()) {
    config[segment.label] = {
      label: segment.label,
      colors: accountSeriesColors(index),
    };
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <EChartsPieChart
      animation={false}
      className={cn("w-full px-1 pb-2", CHAT_TOOL_CHART_HEIGHT_CLASS)}
      config={config}
      data={data}
      dataKey={VALUE_KEY}
      nameKey="name"
    >
      <EChartsPieChart.Pie
        innerRadius={DONUT_INNER_RADIUS}
        outerRadius={DONUT_OUTER_RADIUS}
        cornerRadius={DONUT_CORNER_RADIUS}
        paddingAngle={DONUT_PADDING_ANGLE}
      />
      <EChartsPieChart.Tooltip />
      <EChartsPieChart.Legend />
    </EChartsPieChart>
  );
}

function ChartPlot({ chart }: { chart: ChartArtifact }) {
  switch (chart.kind) {
    case "empty":
      return <EmptyChartMessage message={chart.emptyMessage} />;
    case "pie":
      return <PieArtifactChart chart={chart} />;
    case "bar":
      return <BarArtifactChart chart={chart} />;
    case "area":
      return <AreaArtifactChart chart={chart} />;
    default: {
      const exhaustive: never = chart;
      return exhaustive;
    }
  }
}

export function ToolOutputChart({ chart }: ToolOutputChartProps) {
  return (
    <ChartFrame subtitle={chart.subtitle} title={chart.title}>
      <ChartPlot chart={chart} />
    </ChartFrame>
  );
}
