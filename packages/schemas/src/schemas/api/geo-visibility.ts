import "zod/compile";
import { z } from "@hono/zod-openapi";
import { GEO_SHORT_FIELD_MAX_LENGTH } from "@notra/geo-core/constants/geo";

import { organizationResponseSchema } from "./content";
import { projectParamsSchema } from "./geo-params";

const GEO_WINDOW_MAX_DAYS = 365;
const GEO_DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dayString = (name: string) =>
  z
    .string()
    .regex(GEO_DAY_REGEX, "Expected a YYYY-MM-DD date")
    .optional()
    .openapi({ param: { name, in: "query" }, example: "2026-01-31" });

export const geoWindowQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(GEO_WINDOW_MAX_DAYS)
    .optional()
    .openapi({
      param: { name: "days", in: "query" },
      description: "Rolling window size in days. Ignored when from/to are set.",
    }),
  from: dayString("from"),
  to: dayString("to"),
});

const sparklinePointSchema = z.object({ day: z.string(), value: z.number() });

const overviewEngineSchema = z.object({
  engine: z.string(),
  checks: z.number().int(),
  mentions: z.number().int(),
  mentionRate: z.number(),
  avgPosition: z.number().nullable(),
  lastCheckedAt: z.string(),
});

export const visibilityOverviewResponseSchema = z
  .object({
    configured: z.boolean().openapi({
      description: "Whether the analytics backend is configured.",
    }),
    engines: z.array(overviewEngineSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityOverviewResponse");

const timeseriesPointSchema = z.object({
  day: z.string(),
  engine: z.string(),
  checks: z.number().int(),
  mentions: z.number().int(),
  avgPosition: z.number().nullable().optional(),
});

export const visibilityTimeseriesResponseSchema = z
  .object({
    configured: z.boolean(),
    points: z.array(timeseriesPointSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityTimeseriesResponse");

const answerSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  domain: z.string(),
});

const promptResultSchema = z.object({
  promptId: z.string(),
  engine: z.string(),
  prompt: z.string(),
  answer: z.string(),
  mentioned: z.boolean(),
  position: z.number().int().nullable(),
  sentiment: z.string().nullable(),
  competitors: z.array(z.string()),
  excerpt: z.string(),
  searchQueries: z.array(z.string()),
  sources: z.array(answerSourceSchema),
  lastCheckedAt: z.string(),
});

export const visibilityPromptResultsResponseSchema = z
  .object({
    configured: z.boolean(),
    results: z.array(promptResultSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityPromptResultsResponse");

const competitorSharePointSchema = z.object({
  brand: z.string(),
  mentions: z.number().int(),
  trend: z.array(sparklinePointSchema).optional(),
});

const competitorShareTimeseriesPointSchema = z.object({
  brand: z.string(),
  day: z.string(),
  mentions: z.number().int(),
});

export const visibilityCompetitorShareResponseSchema = z
  .object({
    configured: z.boolean(),
    points: z.array(competitorSharePointSchema),
    timeseries: z.array(competitorShareTimeseriesPointSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityCompetitorShareResponse");

export const competitorDetailParamsSchema = projectParamsSchema.extend({
  brand: z
    .string()
    .trim()
    .min(1)
    .max(GEO_SHORT_FIELD_MAX_LENGTH)
    .openapi({
      param: { name: "brand", in: "path" },
      description: "Competitor brand name as reported by competitor-share.",
    }),
});

const competitorTimeseriesPointSchema = z.object({
  day: z.string(),
  mentions: z.number().int(),
  checks: z.number().int(),
});

const competitorPromptRowSchema = z.object({
  promptId: z.string(),
  prompt: z.string(),
  engine: z.string(),
  capturedAt: z.string(),
  mentioned: z.boolean(),
  position: z.number().int().nullable(),
});

export const visibilityCompetitorDetailResponseSchema = z
  .object({
    configured: z.boolean(),
    points: z.array(competitorTimeseriesPointSchema),
    prompts: z.array(competitorPromptRowSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityCompetitorDetailResponse");

const languageSharePointSchema = z.object({
  language: z.string(),
  checks: z.number().int(),
  mentions: z.number().int(),
  mentionRate: z.number(),
  avgPosition: z.number().nullable(),
  trend: z.array(sparklinePointSchema).optional(),
});

export const visibilityLanguageShareResponseSchema = z
  .object({
    configured: z.boolean(),
    points: z.array(languageSharePointSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoVisibilityLanguageShareResponse");
