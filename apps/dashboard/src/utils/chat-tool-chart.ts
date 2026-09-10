import { toolOutputChartSchema } from "@notra/ai/schemas/chart-artifact";
import type {
  ChartArtifact,
  ChartSeries,
} from "@notra/ai/types/chart-artifact";

export function parseToolOutputChart(
  output: unknown
): ChartArtifact | undefined {
  const parsed = toolOutputChartSchema.safeParse(output);
  return parsed.success ? parsed.data.chart : undefined;
}

export function pivotChartSeries(
  series: readonly ChartSeries[]
): Record<string, string | number | null>[] {
  const xs = [
    ...new Set(series.flatMap((entry) => entry.points.map((point) => point.x))),
  ];
  const pointsByName = new Map(
    series.map((entry) => [
      entry.name,
      new Map(entry.points.map((point) => [point.x, point.y] as const)),
    ])
  );

  return xs.map((x) => {
    const row: Record<string, string | number | null> = { x };
    for (const [name, points] of pointsByName) {
      row[name] = points.get(x) ?? null;
    }
    return row;
  });
}
