import "zod/compile";
import { z } from "@hono/zod-openapi";
import { GEO_SHORT_FIELD_MAX_LENGTH } from "@notra/geo-core/constants/geo";

import { organizationResponseSchema } from "./content";
import { projectParamsSchema } from "./geo-params";
import { geoWindowQuerySchema } from "./geo-visibility";

const sentimentBucketSchema = z.object({
  totalChecks: z.number().int(),
  mentions: z.number().int(),
  positive: z.number().int(),
  neutral: z.number().int(),
  negative: z.number().int(),
  lastCheckedAt: z.string().nullable(),
  score: z.number().nullable(),
  classifiedMentions: z.number().int(),
  unknownMentions: z.number().int(),
  notMentioned: z.number().int(),
  positiveShare: z.number().nullable(),
  neutralShare: z.number().nullable(),
  negativeShare: z.number().nullable(),
  classificationCoverage: z.number().nullable(),
});

export const geoSentimentResponseSchema = z
  .object({
    configured: z.literal(true),
    summary: sentimentBucketSchema,
    engines: z.array(sentimentBucketSchema.extend({ engine: z.string() })),
    points: z.array(sentimentBucketSchema.extend({ day: z.string() })),
    comparison: z
      .object({
        current: z.object({ from: z.string(), to: z.string() }),
        previous: z.object({ from: z.string(), to: z.string() }),
        summary: sentimentBucketSchema,
        points: z.array(sentimentBucketSchema.extend({ day: z.string() })),
        delta: z.number().nullable(),
      })
      .optional(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoSentimentResponse");

export const geoSentimentEvidenceQuerySchema = geoWindowQuerySchema.extend({
  cursor: z.string().max(4096).optional(),
});

export const geoSentimentEvidenceResponseSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.string(),
        scanId: z.string(),
        promptId: z.string(),
        prompt: z.string(),
        engine: z.string(),
        language: z.string(),
        capturedAt: z.string(),
        answer: z.string(),
        excerpt: z.string(),
      })
    ),
    nextCursor: z.string().nullable(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoSentimentEvidenceResponse");

const sentimentEvidenceSchema = z.object({
  checkId: z.string(),
  quote: z.string(),
  prompt: z.string(),
  engine: z.string(),
  capturedAt: z.string(),
});

export const geoSentimentAnalysisResponseSchema = z
  .object({
    status: z.enum(["ready", "pending", "stale", "failed", "unavailable"]),
    result: z
      .object({
        fingerprint: z.string(),
        generatedAt: z.string(),
        sampled: z.number().int(),
        eligible: z.number().int(),
        themes: z.array(
          z.object({
            title: z.string(),
            polarity: z.enum(["positive", "negative"]),
            claims: z.array(
              z.object({
                statement: z.string(),
                evidence: z.array(sentimentEvidenceSchema),
              })
            ),
            evidence: z.array(sentimentEvidenceSchema),
          })
        ),
      })
      .nullable(),
    message: z.string().nullable(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoSentimentAnalysisResponse");

const changeStateSchema = z.object({
  mentioned: z.boolean(),
  position: z.number().nullable(),
});

const changeScanSchema = z.object({
  id: z.string(),
  finishedAt: z.string().nullable(),
});

export const geoChangesResponseSchema = z
  .object({
    previousScan: changeScanSchema.nullable(),
    currentScan: changeScanSchema.nullable(),
    summary: z.object({
      gained: z.number().int(),
      lost: z.number().int(),
      positionImproved: z.number().int(),
      positionDropped: z.number().int(),
      citationsAdded: z.number().int(),
      citationsRemoved: z.number().int(),
    }),
    events: z.array(
      z.object({
        kind: z.enum([
          "gained_mention",
          "lost_mention",
          "position_improved",
          "position_dropped",
          "competitor_displaced",
          "citation_added",
          "citation_removed",
          "competitor_cited",
          "new_engine",
        ]),
        promptId: z.string(),
        prompt: z.string(),
        engine: z.string(),
        previous: changeStateSchema.nullable(),
        current: changeStateSchema,
        competitors: z.array(z.string()),
        domains: z.array(z.string()),
      })
    ),
    organization: organizationResponseSchema,
  })
  .openapi("GeoChangesResponse");

export const geoPromptHistoryParamsSchema = projectParamsSchema.extend({
  promptId: z.string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
});

export const geoPromptHistoryQuerySchema = z.object({
  scanId: z.string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
});

export const geoPromptHistoryResponseSchema = z
  .object({
    configured: z.boolean(),
    promptId: z.string(),
    checks: z.array(
      z.object({
        id: z.string(),
        scanId: z.string(),
        engine: z.string(),
        mentioned: z.boolean(),
        ownedSourceCited: z.boolean().optional(),
        position: z.number().nullable(),
        sentiment: z.string().nullable(),
        competitors: z.array(z.string()),
        language: z.string(),
        capturedAt: z.string(),
      })
    ),
    organization: organizationResponseSchema,
  })
  .openapi("GeoPromptHistoryResponse");

export { geoWindowQuerySchema as geoSentimentQuerySchema };
