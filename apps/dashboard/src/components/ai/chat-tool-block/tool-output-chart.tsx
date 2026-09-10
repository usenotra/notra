"use client";

import type {
  AreaChartArtifact,
  BarChartArtifact,
  ChartArtifact,
  PieChartArtifact,
} from "@notra/ai/types/chart-artifact";
import { type ReactNode, useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import {
  CHAT_TOOL_CHART_HEIGHT_CLASS,
  CHAT_TOOL_CHART_OPTIONS,
  CHART_PRIMARY_COLOR,
  DONUT_INNER_RADIUS,
  DONUT_OUTER_RADIUS,
} from "@/constants/charts";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types/charts";
import type { ToolOutputChartProps } from "@/types/components/chat-tool-chart";
import { accountSeriesColors, seriesColors } from "@/utils/chart-colors";
import { pivotChartSeries } from "@/utils/chat-tool-chart";

const VALUE_KEY = "value";
const CATEGORY_KEY = "category";
const X_KEY = "x";

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
      <div className="px-3 pt-2.5 pb-1">
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
  const series = chart.series;
  const data = useMemo(() => pivotChartSeries(series), [series]);
  const config = useMemo(() => {
    const next: ChartConfig = {};
    for (const [index, entry] of series.entries()) {
      next[entry.name] = {
        label: entry.name,
        colors: accountSeriesColors(index),
      };
    }
    return next;
  }, [series]);

  if (data.length === 0) {
    return null;
  }

  return (
    <EChartsAreaChart
      animation={false}
      chartOptions={CHAT_TOOL_CHART_OPTIONS}
      className={cn("w-full px-1 pb-1", CHAT_TOOL_CHART_HEIGHT_CLASS)}
      config={config}
      curveType="monotone"
      data={data}
      xDataKey={X_KEY}
    >
      {series.map((entry) => (
        <EChartsAreaChart.Area
          dataKey={entry.name}
          gapMissing
          key={entry.name}
          strokeVariant="solid"
          variant="gradient"
        />
      ))}
      <EChartsAreaChart.Tooltip confine={false} />
    </EChartsAreaChart>
  );
}

function BarArtifactChart({ chart }: { chart: BarChartArtifact }) {
  const segments = chart.segments;
  const data = useMemo(
    () =>
      segments.map((segment) => ({
        [CATEGORY_KEY]: segment.label,
        [VALUE_KEY]: segment.value,
      })),
    [segments]
  );
  const config = useMemo<ChartConfig>(
    () => ({
      [VALUE_KEY]: {
        label: chart.title,
        colors: seriesColors(CHART_PRIMARY_COLOR),
      },
    }),
    [chart.title]
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <EChartsBarChart
      animation={false}
      chartOptions={CHAT_TOOL_CHART_OPTIONS}
      className={cn("w-full px-1 pb-1", CHAT_TOOL_CHART_HEIGHT_CLASS)}
      config={config}
      data={data}
      xDataKey={CATEGORY_KEY}
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis dataKey={CATEGORY_KEY} />
      <EChartsBarChart.YAxis />
      <EChartsBarChart.Bar dataKey={VALUE_KEY} />
      <EChartsBarChart.Tooltip />
    </EChartsBarChart>
  );
}

function PieArtifactChart({ chart }: { chart: PieChartArtifact }) {
  const segments = chart.segments;
  const data = useMemo(
    () =>
      segments.map((segment) => ({
        name: segment.label,
        [VALUE_KEY]: segment.value,
      })),
    [segments]
  );
  const config = useMemo(() => {
    const next: ChartConfig = {};
    for (const [index, segment] of segments.entries()) {
      next[segment.label] = {
        label: segment.label,
        colors: accountSeriesColors(index),
      };
    }
    return next;
  }, [segments]);

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
