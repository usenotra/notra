import {
  GEO_TOOL_DEFAULT_COMPETITOR_LIMIT,
  GEO_TOOL_DEFAULT_DAYS,
  GEO_TOOL_DEFAULT_PROMPT_RESULT_LIMIT,
  GEO_TOOL_MAX_COMPETITOR_LIMIT,
  GEO_TOOL_MAX_DAYS,
  GEO_TOOL_MAX_PROMPT_RESULT_LIMIT,
} from "@notra/ai/constants/geo-tools";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const projectIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Limit results to one GEO project ID returned by the project-listing tool. Omit for all projects."
  );

const daysSchema = z
  .number()
  .int()
  .min(1)
  .max(GEO_TOOL_MAX_DAYS)
  .default(GEO_TOOL_DEFAULT_DAYS)
  .describe("Number of trailing days to include.");

const includeAnswersSchema = z
  .boolean()
  .default(false)
  .describe("Return full AI answers instead of short excerpts.");

export const listGeoProjectsInputSchema = z.object({});

export const getGeoOverviewInputSchema = z.object({
  projectId: projectIdSchema,
  days: daysSchema,
});

export const getGeoTimeseriesInputSchema = z.object({
  projectId: projectIdSchema,
  days: daysSchema,
});

export const getGeoPromptResultsInputSchema = z.object({
  projectId: projectIdSchema,
  days: daysSchema,
  includeAnswers: includeAnswersSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(GEO_TOOL_MAX_PROMPT_RESULT_LIMIT)
    .default(GEO_TOOL_DEFAULT_PROMPT_RESULT_LIMIT)
    .describe("Maximum number of latest prompt and engine results to return."),
});

export const getGeoCompetitorShareInputSchema = z.object({
  projectId: projectIdSchema,
  days: daysSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(GEO_TOOL_MAX_COMPETITOR_LIMIT)
    .default(GEO_TOOL_DEFAULT_COMPETITOR_LIMIT)
    .describe("Maximum number of competing brands to return."),
});

export const getGeoProjectContextInputSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe("GEO project ID returned by the project-listing tool."),
  includeAnswers: includeAnswersSchema,
  competitorSearch: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Find tracked competitors whose name contains this text. Use when the project tracks more competitors than the ones returned."
    ),
});

export const getGeoWriterContextInputSchema = z.object({
  includeAnswers: includeAnswersSchema,
});
