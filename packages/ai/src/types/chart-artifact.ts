import type { chartArtifactSchema } from "@notra/ai/schemas/chart-artifact";
import type { z } from "zod";

export type ChartArtifact = z.infer<typeof chartArtifactSchema>;
export type ChartKind = ChartArtifact["kind"];
export type AreaChartArtifact = Extract<ChartArtifact, { kind: "area" }>;
export type BarChartArtifact = Extract<ChartArtifact, { kind: "bar" }>;
export type PieChartArtifact = Extract<ChartArtifact, { kind: "pie" }>;
export type EmptyChartArtifact = Extract<ChartArtifact, { kind: "empty" }>;
export type ChartSeries = AreaChartArtifact["series"][number];
export type ChartSegment = BarChartArtifact["segments"][number];

export interface GeoOverviewChartInput {
  days: number;
  engines: readonly {
    engine: string;
    mention_rate: number;
  }[];
}

export interface GeoTimeseriesChartInput {
  days: number;
  points: readonly {
    day: string;
    engine: string;
    mention_rate: number;
  }[];
}

export interface GeoCompetitorShareChartInput {
  days: number;
  competitors: readonly {
    brand: string;
    mentions: number;
  }[];
}
