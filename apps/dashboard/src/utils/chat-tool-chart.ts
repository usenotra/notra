import { toolOutputChartSchema } from "@notra/ai/schemas/chart-artifact";
import type {
  ChartArtifact,
  ChartSegment,
  ChartSeries,
} from "@notra/ai/types/chart-artifact";

import { CHART_PERCENT_SCALE } from "@/constants/charts";
import type { ToolOutputRankRow } from "@/types/components/chat-tool-chart";
import { chartKey } from "@/utils/chart-keys";
import {
  formatChartEngineLabel,
  formatChartEngineRankLabel,
} from "@/utils/geo-model-display";

export const CHART_CATEGORY_KEY = "__category";

export function parseToolOutputChart(
  output: unknown
): ChartArtifact | undefined {
  const parsed = toolOutputChartSchema.safeParse(output);
  return parsed.success ? parsed.data.chart : undefined;
}

export function chartSeriesDataKey(name: string, index: number): string {
  return `${chartKey(name)}-${index}`;
}

export function pivotChartSeries(
  series: readonly ChartSeries[]
): Record<string, string | number | null>[] {
  const xs = [
    ...new Set(series.flatMap((entry) => entry.points.map((point) => point.x))),
  ];
  const keyedSeries = series.map((entry, index) => ({
    dataKey: chartSeriesDataKey(entry.name, index),
    points: new Map(entry.points.map((point) => [point.x, point.y] as const)),
  }));

  return xs.map((x) => {
    const row: Record<string, string | number | null> = {
      [CHART_CATEGORY_KEY]: x,
    };
    for (const entry of keyedSeries) {
      row[entry.dataKey] = entry.points.get(x) ?? null;
    }
    return row;
  });
}

function formatRankNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

export function rankBarChartSegments(
  segments: readonly ChartSegment[]
): ToolOutputRankRow[] {
  const maxValue = Math.max(0, ...segments.map((segment) => segment.value));
  const asPercent = maxValue <= CHART_PERCENT_SCALE;
  const scale = asPercent ? CHART_PERCENT_SCALE : maxValue || 1;

  const ranked = [...segments].sort((left, right) => right.value - left.value);
  const baseNames = ranked.map((segment) =>
    formatChartEngineLabel(segment.label)
  );
  const nameCounts = new Map<string, number>();
  for (const name of baseNames) {
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  return ranked.map((segment, index) => {
    const baseName = baseNames[index] ?? formatChartEngineLabel(segment.label);
    const showSearchMode = (nameCounts.get(baseName) ?? 0) > 1;
    return {
      engine: segment.label,
      name: formatChartEngineRankLabel(segment.label, showSearchMode),
      value: segment.value,
      valueLabel: asPercent
        ? `${formatRankNumber(segment.value)}%`
        : formatRankNumber(segment.value),
      widthPercent: (segment.value / scale) * CHART_PERCENT_SCALE,
    };
  });
}
