import type { ChartArtifact } from "@notra/ai/types/chart-artifact";

export interface ToolOutputChartProps {
  chart: ChartArtifact;
}

export interface ToolOutputRankRow {
  engine: string;
  name: string;
  value: number;
  valueLabel: string;
  widthPercent: number;
}
