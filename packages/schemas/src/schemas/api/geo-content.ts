import "zod/compile";
import { z } from "@hono/zod-openapi";
import { BLOG_POST_SUBTYPES } from "@notra/db/constants/content";
import {
  GEO_CONTENT_BRIEF_STATUSES,
  GEO_WRITER_SOURCE_KINDS,
} from "@notra/db/constants/geo-writer";
import {
  GEO_EXISTING_PAGE_URL_MAX_LENGTH,
  GEO_MAX_COMPETITORS,
} from "@notra/geo-core/constants/geo";

import { organizationResponseSchema } from "./content";
import { projectParamsSchema } from "./geo-params";
import { resourceIdSchema } from "./ids";

const GEO_BRIEF_TOPIC_MIN_LENGTH = 3;
const GEO_BRIEF_TOPIC_MAX_LENGTH = 200;
const GEO_BRIEF_MAX_BRAND_VOICES = 8;

const gapBriefBaselineSchema = z.object({
  mentionedEngines: z.number(),
  totalEngines: z.number(),
});

const gapBriefRefSchema = z.object({
  briefId: z.string(),
  status: z.enum(GEO_CONTENT_BRIEF_STATUSES),
  postId: z.string().nullable(),
  workingTitle: z.string().nullable(),
  publishedAt: z.string().nullable(),
  baseline: gapBriefBaselineSchema.nullable(),
  rescanned: z.boolean(),
});

const promptGapSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  title: z.string().nullable(),
  engines: z.array(z.string()),
  mentionedEngines: z.array(z.string()),
  competitors: z.array(z.string()),
  discoveredCompetitors: z.array(z.string()),
  ownMentionRate: z.number(),
  engineCoverage: z.number(),
  opportunity: z.number(),
  won: z.boolean(),
  brief: gapBriefRefSchema.nullable(),
});

const searchGapTargetSchema = z.object({
  kind: z.enum(["page", "post"]),
  id: z.string(),
  url: z.string().nullable(),
  title: z.string(),
  score: z.number(),
});

const searchGapRecommendationSchema = z.object({
  action: z.enum(["create", "update", "merge", "ignore"]).openapi({
    description:
      "What to do with this query cluster: create a new page, update the strongest existing page, merge overlapping pages, or ignore thin demand.",
  }),
  reason: z.string(),
  targets: z.array(searchGapTargetSchema),
});

const searchGapSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  title: z.string().nullable(),
  impressions: z.number().nullable(),
  clicks: z.number().nullable(),
  position: z.number().nullable(),
  queries: z.array(
    z.object({
      query: z.string(),
      clicks: z.number(),
      impressions: z.number(),
      position: z.number(),
    })
  ),
  brief: gapBriefRefSchema.nullable(),
  recommendation: searchGapRecommendationSchema,
});

export const contentGapsResponseSchema = z
  .object({
    promptGaps: z.array(promptGapSchema),
    searchGaps: z.array(searchGapSchema),
    hasScanData: z.boolean().openapi({
      description: "False until the project has at least one scan result.",
    }),
    organization: organizationResponseSchema,
  })
  .openapi("GeoContentGapsResponse");

export const briefParamsSchema = projectParamsSchema.extend({
  briefId: resourceIdSchema("briefId").openapi({
    param: { name: "briefId", in: "path" },
  }),
});

const briefSectionSchema = z.object({
  heading: z.string(),
  goal: z.string(),
  claims: z.array(z.string()),
});

const briefInternalLinkSchema = z.object({
  url: z.string(),
  anchor: z.string(),
  why: z.string(),
});

const briefDocumentSchema = z
  .object({
    targetPrompt: z.string(),
    intent: z.string(),
    contentSubtype: z.enum(BLOG_POST_SUBTYPES),
    workingTitle: z.string(),
    audience: z.string(),
    jobToBeDone: z.string(),
    sections: z.array(briefSectionSchema),
    questionsToAnswer: z.array(z.string()),
    internalLinks: z.array(briefInternalLinkSchema),
    acceptanceChecklist: z.array(z.string()),
    recommendedAngle: z.string().optional(),
    competitorsToCounter: z.array(z.string()).optional(),
    sourcesToReference: z.array(z.string()).optional(),
    missingCoverage: z.array(z.string()).optional(),
    baseline: z
      .object({
        sourcePromptId: z.string(),
        mentionedEngines: z.number(),
        totalEngines: z.number(),
        engines: z.array(
          z.object({
            engine: z.string(),
            mentioned: z.boolean(),
            position: z.number().nullable(),
          })
        ),
        competitorMentions: z.array(
          z.object({ name: z.string(), engines: z.number() })
        ),
        citedDomains: z.array(
          z.object({ domain: z.string(), engines: z.number() })
        ),
        capturedAt: z.string().nullable(),
      })
      .nullable()
      .optional(),
  })
  .openapi("GeoContentBriefDocument");

const briefSummarySchema = z
  .object({
    id: z.string(),
    topic: z.string(),
    workingTitle: z.string(),
    status: z.enum(GEO_CONTENT_BRIEF_STATUSES),
    postId: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("GeoContentBriefSummary");

export const listBriefsResponseSchema = z
  .object({
    briefs: z.array(briefSummarySchema),
    organization: organizationResponseSchema,
  })
  .openapi("ListGeoContentBriefsResponse");

const briefDetailSchema = z
  .object({
    id: z.string(),
    topic: z.string(),
    brief: briefDocumentSchema,
    status: z.enum(GEO_CONTENT_BRIEF_STATUSES),
    autoApproved: z.boolean(),
    runId: z.string().nullable(),
    postId: z.string().nullable(),
    humanized: z.boolean(),
    error: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .openapi("GeoContentBriefDetail");

export const briefResponseSchema = z
  .object({
    brief: briefDetailSchema,
    organization: organizationResponseSchema,
  })
  .openapi("GeoContentBriefResponse");

export const planBriefRequestSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(GEO_BRIEF_TOPIC_MIN_LENGTH)
      .max(GEO_BRIEF_TOPIC_MAX_LENGTH)
      .openapi({
        description:
          "What the article should target. Replaced by the source prompt when sourceKind is gap, prompt or search_console.",
      }),
    autoApprove: z.boolean().default(false).openapi({
      description:
        "Start the writer immediately instead of leaving the brief in draft.",
    }),
    contentSubtype: z.enum(BLOG_POST_SUBTYPES).optional(),
    brandVoiceIds: z
      .array(resourceIdSchema("brandVoiceId"))
      .max(GEO_BRIEF_MAX_BRAND_VOICES)
      .optional()
      .openapi({
        description:
          "Only the first entry is used; it overrides the project's brand identity.",
      }),
    competitorIds: z
      .array(resourceIdSchema("competitorId"))
      .max(GEO_MAX_COMPETITORS)
      .optional(),
    sitemapId: resourceIdSchema("sitemapId").optional(),
    sourceKind: z.enum(GEO_WRITER_SOURCE_KINDS).optional(),
    sourceId: z.string().min(1).optional().openapi({
      description:
        "Gap, prompt or search-console suggestion id. An open brief for the same source is reused instead of planning a new one.",
    }),
    existingPageUrl: z
      .url()
      .max(GEO_EXISTING_PAGE_URL_MAX_LENGTH)
      .optional()
      .openapi({
        description:
          "Existing page the article should refresh instead of creating a competing page.",
      }),
  })
  .openapi("PlanGeoContentBriefRequest");

export const planBriefResponseSchema = z
  .object({
    briefId: z.string(),
    brief: briefDocumentSchema,
    status: z.enum(GEO_CONTENT_BRIEF_STATUSES),
    runId: z.string().nullable(),
    postId: z.string().nullable(),
    organization: organizationResponseSchema,
  })
  .openapi("PlanGeoContentBriefResponse");

export const approveBriefResponseSchema = z
  .object({
    runId: z.string(),
    organization: organizationResponseSchema,
  })
  .openapi("ApproveGeoContentBriefResponse");
