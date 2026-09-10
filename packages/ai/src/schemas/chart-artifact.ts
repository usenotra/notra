// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const chartTitleSchema = z.string().min(1);
const chartSubtitleSchema = z.string().optional();

export const chartPointSchema = z.object({
  x: z.string(),
  y: z.number(),
});

export const chartSeriesSchema = z.object({
  name: z.string().min(1),
  points: z.array(chartPointSchema),
});

export const chartSegmentSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
});

const chartMetaSchema = {
  title: chartTitleSchema,
  subtitle: chartSubtitleSchema,
};

export const emptyChartArtifactSchema = z.object({
  kind: z.literal("empty"),
  ...chartMetaSchema,
  emptyMessage: z.string().min(1),
});

export const barChartArtifactSchema = z.object({
  kind: z.literal("bar"),
  ...chartMetaSchema,
  segments: z.array(chartSegmentSchema).min(1),
});

export const pieChartArtifactSchema = z.object({
  kind: z.literal("pie"),
  ...chartMetaSchema,
  segments: z.array(chartSegmentSchema).min(1),
});

export const areaChartArtifactSchema = z.object({
  kind: z.literal("area"),
  ...chartMetaSchema,
  series: z.array(chartSeriesSchema).min(1),
});

export const chartArtifactSchema = z.discriminatedUnion("kind", [
  emptyChartArtifactSchema,
  barChartArtifactSchema,
  pieChartArtifactSchema,
  areaChartArtifactSchema,
]);

export const toolOutputChartSchema = z
  .object({
    chart: chartArtifactSchema,
  })
  .passthrough();
