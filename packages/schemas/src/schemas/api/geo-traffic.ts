import "zod/compile";
import { z } from "@hono/zod-openapi";
import { GEO_SHORT_FIELD_MAX_LENGTH } from "@notra/geo-core/constants/geo";

import { organizationResponseSchema } from "./content";
import { projectParamsSchema } from "./geo-params";
import { geoWindowQuerySchema } from "./geo-visibility";
import { resourceIdSchema } from "./ids";

const AI_TRAFFIC_MAX_LOG_LIMIT = 200;
const AI_TRAFFIC_MAX_PAGES_LIMIT = 500;
const AI_TRAFFIC_MAX_JOURNEYS_LIMIT = 100;
const AI_TRAFFIC_MAX_FILTER_VALUES = 3;

const visitorTypeSchema = z.enum([
  "crawler",
  "ai_referral",
  "human",
  "unknown",
]);

const trafficLimitParam = (name: string, max: number) =>
  z.coerce
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .openapi({ param: { name, in: "query" } });

const commaSeparated = <T extends string>(
  name: string,
  values: readonly [T, ...T[]]
) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : undefined
    )
    .pipe(z.array(z.enum(values)).max(AI_TRAFFIC_MAX_FILTER_VALUES).optional())
    .openapi({
      param: { name, in: "query" },
      description: `Comma-separated. One or more of: ${values.join(", ")}.`,
    });

export const trafficOverviewQuerySchema = geoWindowQuerySchema.extend({});

export const trafficLogQuerySchema = z.object({
  limit: trafficLimitParam("limit", AI_TRAFFIC_MAX_LOG_LIMIT),
  visitorTypes: commaSeparated("visitorTypes", ["crawler", "ai_referral"]),
  categories: commaSeparated("categories", [
    "training-crawler",
    "search-index",
    "assistant-browse",
  ]),
});

export const trafficJourneysQuerySchema = geoWindowQuerySchema.extend({
  limit: trafficLimitParam("limit", AI_TRAFFIC_MAX_JOURNEYS_LIMIT),
});

export const trafficPagesQuerySchema = geoWindowQuerySchema.extend({
  limit: trafficLimitParam("limit", AI_TRAFFIC_MAX_PAGES_LIMIT),
  visitorType: z
    .enum(["crawler", "ai_referral"])
    .optional()
    .openapi({ param: { name: "visitorType", in: "query" } }),
});

export const journeyParamsSchema = projectParamsSchema.extend({
  journeyId: z
    .string()
    .trim()
    .min(1)
    .max(GEO_SHORT_FIELD_MAX_LENGTH)
    .openapi({ param: { name: "journeyId", in: "path" } }),
});

const trafficSourceSchema = z.object({
  source: z.string(),
  visitorType: visitorTypeSchema,
  agent: z.string(),
  category: z.string(),
  confidence: z.string(),
  visits: z.number().int(),
  previousVisits: z.number().int().optional(),
  markdownVisits: z.number().int(),
  paths: z.number().int(),
  lastSeenAt: z.string(),
});

const trafficPointSchema = z.object({
  day: z.string(),
  visitorType: visitorTypeSchema,
  source: z.string(),
  visits: z.number().int(),
});

const trafficConfiguredField = z.boolean().openapi({
  description:
    "False when the traffic backend is not configured for this deployment; the payload is then empty rather than an error.",
});

export const trafficOverviewResponseSchema = z
  .object({
    configured: trafficConfiguredField,
    totals: z.object({
      crawler: z.number().int(),
      cited: z.number().int(),
      aiReferral: z.number().int(),
      conversions: z.number().int().nullable().openapi({
        description:
          "AI referral visits that reached a configured conversion path. Null when no conversion paths are set.",
      }),
    }),
    previousConversions: z.number().int().nullable().openapi({
      description:
        "Conversions in the previous window of the same length. Null when no conversion paths are set or no comparison data exists.",
    }),
    sources: z.array(trafficSourceSchema),
    points: z.array(trafficPointSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoTrafficOverviewResponse");

const trafficLogEntrySchema = z.object({
  capturedAt: z.string(),
  visitorType: visitorTypeSchema,
  source: z.string(),
  agent: z.string(),
  category: z.string(),
  confidence: z.string(),
  path: z.string(),
  host: z.string(),
  country: z.string(),
  ua: z.string(),
  journeyId: z.string(),
  wantsMarkdown: z.boolean(),
});

export const trafficLogResponseSchema = z
  .object({
    configured: trafficConfiguredField,
    log: z.array(trafficLogEntrySchema),
    total: z.number().int(),
    organization: organizationResponseSchema,
  })
  .openapi("GeoTrafficLogResponse");

const journeySchema = z.object({
  journeyId: z.string(),
  source: z.string(),
  visitorType: visitorTypeSchema,
  pages: z.number().int(),
  distinctPaths: z.number().int(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  samplePaths: z.array(z.string()),
});

export const trafficJourneysResponseSchema = z
  .object({
    configured: trafficConfiguredField,
    journeys: z.array(journeySchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoTrafficJourneysResponse");

const journeyEventSchema = z.object({
  capturedAt: z.string(),
  path: z.string(),
  host: z.string(),
  method: z.string(),
  referer: z.string(),
  country: z.string(),
  agent: z.string(),
  category: z.string(),
});

export const journeyDetailResponseSchema = z
  .object({
    configured: trafficConfiguredField,
    events: z.array(journeyEventSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoJourneyDetailResponse");

const trafficPageSchema = z.object({
  path: z.string(),
  source: z.string(),
  visitorType: visitorTypeSchema,
  visits: z.number().int(),
  previousVisits: z.number().int().optional(),
  lastSeenAt: z.string(),
});

export const trafficPagesResponseSchema = z
  .object({
    configured: trafficConfiguredField,
    pages: z.array(trafficPageSchema),
    organization: organizationResponseSchema,
  })
  .openapi("GeoTrafficPagesResponse");

export const ingestTokenQuerySchema = z.object({
  projectId: resourceIdSchema("projectId")
    .optional()
    .openapi({
      param: { name: "projectId", in: "query" },
      description:
        "Bind the token to one project. Omit to track the whole organization.",
    }),
});

/**
 * Install instructions without the token. The snippets reference the token's
 * environment variable, not its value, so this carries no credential and is
 * what the read-scoped setup endpoint returns.
 */
const ingestSetupFieldsSchema = z.object({
  ingestUrl: z.string().openapi({
    description: "Endpoint the tracking snippet posts events to.",
  }),
  snippet: z.string().openapi({
    description: "Install snippet for the default framework (Next.js).",
  }),
  snippets: z.object({
    next: z.string(),
    nuxt: z.string(),
    netlify: z.string(),
  }),
  organization: organizationResponseSchema,
});

export const ingestSetupResponseSchema = ingestSetupFieldsSchema.openapi(
  "GeoIngestSetupResponse"
);

export const ingestTokenResponseSchema = ingestSetupFieldsSchema
  .extend({
    token: z.string().openapi({
      description:
        "Tracking token. Shown once per request; rotating invalidates every previously issued token.",
    }),
  })
  .openapi("GeoIngestTokenResponse");
