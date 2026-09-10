import { toolOutputChartSchema } from "@notra/ai/schemas/chart-artifact";
import type {
  ChartArtifact,
  ChartSeries,
} from "@notra/ai/types/chart-artifact";

import { chartKey } from "@/utils/chart-keys";

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
