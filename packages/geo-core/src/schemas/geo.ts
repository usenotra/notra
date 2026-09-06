import { GEO_BRIEF_MAX_TITLE_LENGTH } from "@notra/ai/constants/geo-writer";
import { SUPPORTED_LANGUAGES } from "@notra/ai/constants/languages";
import { geoContentSubtypeSchema } from "@notra/ai/schemas/geo-writer";
import { POST_MARKDOWN_MAX_LENGTH } from "@notra/ai/schemas/limits";
import {
  array,
  boolean,
  enum as enumType,
  iso,
  number,
  object,
  string,
  url,
} from "zod";

import {
  GEO_BRAND_SEARCH_MAX_QUERY_LENGTH,
  GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
  GEO_COMPETITOR_MAX_SYNONYMS,
  GEO_DISCOVERY_MAX_ALIASES,
  GEO_DISCOVERY_MAX_COMPETITORS,
  GEO_DISCOVERY_MAX_PROMPTS,
  GEO_DISCOVERY_MIN_COMPETITORS,
  GEO_DISCOVERY_MIN_PROMPTS,
  GEO_EXISTING_PAGE_URL_MAX_LENGTH,
  GEO_GAP_TITLE_MAX_LENGTH,
  GEO_CONVERSION_PATH_MAX_LENGTH,
  GEO_MAX_ALIASES,
  GEO_MAX_COMPETITORS,
  GEO_MAX_CONVERSION_PATHS,
  GEO_MAX_ENGINES,
  GEO_MAX_LANGUAGES,
  GEO_MAX_PROMPTS,
  GEO_ONBOARDING_MAX_PROMPTS,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MAX_TAGS,
  GEO_PROMPT_MIN_LENGTH,
  GEO_PROMPT_TAG_MAX_LENGTH,
  GEO_SCAN_MAX_INTERVAL_HOURS,
  GEO_SCAN_MIN_INTERVAL_HOURS,
  GEO_SHORT_FIELD_MAX_LENGTH,
  GEO_SEQUENCE_MAX_TURNS,
  GEO_WRITER_TOPIC_MAX_LENGTH,
  GEO_WRITER_TOPIC_MIN_LENGTH,
} from "../constants/geo";
import { GEO_CSV_IMPORT_MAX_ROWS } from "../constants/geo-import";
import { normalizePromptTags } from "../utils/geo-prompt-tags";
import {
  geoCompetitorDomainSchema,
  geoCompetitorImportRowSchema,
  geoPromptImportRowSchema,
} from "./geo-import";
import { publicWebsiteUrlSchema } from "./url";

const GEO_SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);
const MAX_GEO_TRAFFIC_LOG_FILTER_VALUES = 3;
const MAX_JUDGE_COMPETITORS = 15;
const MAX_EXCERPT_LENGTH = 300;
const MAX_DAYS = 365;
const GEO_DAY_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const geoWindowFields = {
  days: number().int().min(1).max(MAX_DAYS).optional(),
  from: string().regex(GEO_DAY_STRING_REGEX).optional(),
  to: string().regex(GEO_DAY_STRING_REGEX).optional(),
};
const MAX_AI_TRAFFIC_LOG_LIMIT = 200;
const MAX_AI_TRAFFIC_PAGES_LIMIT = 500;
const MAX_AI_TRAFFIC_JOURNEYS_LIMIT = 100;
const MAX_GEO_FIELD_LENGTH = 1024;
const MAX_GEO_URL_LENGTH = 2048;
const MAX_GEO_METHOD_LENGTH = 16;
const MIN_PROMPT_LENGTH = GEO_PROMPT_MIN_LENGTH;
const MAX_PROMPT_LENGTH = GEO_PROMPT_MAX_LENGTH;

export const geoOrganizationInputSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1).optional(),
});

/**
 * Payload of the GEO scan workflow.
 *
 * `claimedAt` is the ISO stamp of the scan-slot claim the trigger took before
 * handing off, and it travels as its own field rather than on
 * `geoOrganizationInputSchema` — a dozen unrelated inputs extend that one, and
 * none of them owns a scan claim. Optional so a workflow queued before the
 * token existed still parses; such a run falls back to the unconditional
 * stamps.
 *
 * `scanId` is the `geo_scans` row the trigger already inserted so its caller
 * could be handed a pollable id. The run adopts it instead of creating a row
 * of its own. Optional: the scheduled sweep starts a run with nobody waiting
 * on an id, and so does any workflow queued before this field existed.
 */
export const geoScanWorkflowPayloadSchema = geoOrganizationInputSchema
  .extend({
    claimedAt: iso.datetime().optional(),
    scanId: string().min(1).optional(),
    promptIds: array(string().min(1)).min(1).optional(),
    engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
      .min(1)
      .max(GEO_MAX_ENGINES)
      .optional(),
  })
  .refine(
    (value) =>
      value.projectId !== undefined ||
      (value.claimedAt === undefined && value.scanId === undefined),
    { message: "A scan claim or scan id requires projectId" }
  )
  .refine(
    (value) => value.scanId === undefined || value.claimedAt !== undefined,
    { message: "A pre-created scan id requires claimedAt" }
  );

export const geoModelCatalogInputSchema = object({
  organizationId: string().min(1),
});

export const geoSettingsEngineAddInputSchema =
  geoOrganizationInputSchema.extend({
    engine: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  });

export const geoSettingsLanguageAddInputSchema =
  geoOrganizationInputSchema.extend({
    language: string()
      .min(1)
      .refine((value) => GEO_SUPPORTED_LANGUAGE_SET.has(value), {
        message: "Unsupported language",
      }),
  });

export const geoConversionPathSchema = string()
  .trim()
  .min(1)
  .max(GEO_CONVERSION_PATH_MAX_LENGTH)
  .refine((value) => value.startsWith("/"), {
    message: "Conversion paths must start with /",
  });

export const geoSettingsUpsertInputSchema = geoOrganizationInputSchema.extend({
  companyName: string().min(1),
  aliases: array(string().min(1)).max(GEO_MAX_ALIASES),
  competitors: array(string().min(1)).max(GEO_MAX_COMPETITORS),
  conversionPaths: array(geoConversionPathSchema)
    .max(GEO_MAX_CONVERSION_PATHS)
    .optional(),
  languages: array(string().min(1))
    .min(1)
    .max(GEO_MAX_LANGUAGES)
    .refine(
      (values) =>
        values.every((value) => GEO_SUPPORTED_LANGUAGE_SET.has(value)),
      {
        message: "Unsupported language",
      }
    ),
  engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .min(1)
    .max(GEO_MAX_ENGINES),
  enforceZdr: boolean(),
  nonZdrApprovedEngines: array(
    string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH)
  ).max(GEO_MAX_ENGINES),
  pausedAutoPromptIds: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .max(GEO_MAX_PROMPTS)
    .optional(),
  enabled: boolean(),
  scanIntervalHours: number()
    .int()
    .min(GEO_SCAN_MIN_INTERVAL_HOURS, { message: "Unsupported scan interval" })
    .max(GEO_SCAN_MAX_INTERVAL_HOURS, { message: "Unsupported scan interval" }),
});

export const geoCompetitorUpsertInputSchema = geoOrganizationInputSchema.extend(
  {
    name: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
    previousName: string()
      .trim()
      .min(1)
      .max(GEO_SHORT_FIELD_MAX_LENGTH)
      .optional(),
    domain: geoCompetitorDomainSchema.nullable(),
    synonyms: array(string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
      .max(GEO_COMPETITOR_MAX_SYNONYMS)
      .optional(),
    kind: enumType(["direct", "indirect"]).optional(),
    color: string()
      .trim()
      .max(GEO_SHORT_FIELD_MAX_LENGTH)
      .nullable()
      .optional(),
  }
);

export const geoCompetitorDeleteInputSchema = geoOrganizationInputSchema.extend(
  {
    name: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  }
);

export const geoCompetitorDetailInputSchema = geoOrganizationInputSchema.extend(
  {
    brand: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
    ...geoWindowFields,
  }
);

export const geoTranslationResultSchema = object({
  translations: array(string().min(1)),
});

export const geoSequenceCreateInputSchema = geoOrganizationInputSchema.extend({
  id: string().uuid().optional(),
  name: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  steps: array(string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH))
    .min(1)
    .max(GEO_SEQUENCE_MAX_TURNS),
});

export const geoSequenceUpdateInputSchema = geoOrganizationInputSchema.extend({
  sequenceId: string().min(1),
  name: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  steps: array(string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH))
    .min(1)
    .max(GEO_SEQUENCE_MAX_TURNS)
    .optional(),
  enabled: boolean().optional(),
});

export const geoSequenceDeleteInputSchema = geoOrganizationInputSchema.extend({
  sequenceId: string().min(1),
});

export const geoSequenceResultsInputSchema = geoOrganizationInputSchema.extend({
  sequenceId: string().min(1).optional(),
});

export const geoSequenceRunInputSchema = geoOrganizationInputSchema.extend({
  sequenceId: string().min(1),
});

export const geoProjectCreateInputSchema = object({
  organizationId: string().min(1),
  name: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  brandSettingsId: string().min(1),
});

export const geoProjectDeleteInputSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1),
});

export const geoPromptHistoryInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
});

export const geoPromptRescanInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
});

export const geoTimeseriesInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
});

export const geoCompetitorShareInputSchema = geoTimeseriesInputSchema.extend({
  summaryOnly: boolean().optional(),
});

export const geoPromptTagsSchema = array(
  string().trim().min(1).max(GEO_PROMPT_TAG_MAX_LENGTH)
)
  .max(GEO_PROMPT_MAX_TAGS)
  .transform((values) => normalizePromptTags(values));

export const geoPromptCreateInputSchema = geoOrganizationInputSchema.extend({
  id: string().uuid().optional(),
  prompt: string().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
  tags: geoPromptTagsSchema.optional(),
});

export const geoPromptUpdateInputSchema = geoOrganizationInputSchema
  .extend({
    promptId: string().min(1),
    enabled: boolean().optional(),
    tags: geoPromptTagsSchema.optional(),
  })
  .refine((value) => value.enabled !== undefined || value.tags !== undefined, {
    message: "Provide enabled or tags",
  });

export const geoAutoPromptToggleInputSchema = geoOrganizationInputSchema.extend(
  {
    promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
    enabled: boolean(),
  }
);

export const geoPromptDeleteInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1),
});

export const geoPromptToggleInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1),
  enabled: boolean(),
});

export const geoPromptsImportInputSchema = geoOrganizationInputSchema.extend({
  rows: array(geoPromptImportRowSchema).min(1).max(GEO_CSV_IMPORT_MAX_ROWS),
});

export const geoCompetitorsImportInputSchema =
  geoOrganizationInputSchema.extend({
    rows: array(geoCompetitorImportRowSchema).min(1).max(GEO_MAX_COMPETITORS),
  });

export const geoGenerateFromWebsiteInputSchema =
  geoOrganizationInputSchema.extend({
    url: publicWebsiteUrlSchema,
  });

const geoTrackingLanguagesSchema = array(string().min(1))
  .min(1)
  .max(GEO_MAX_LANGUAGES)
  .refine(
    (values) => values.every((value) => GEO_SUPPORTED_LANGUAGE_SET.has(value)),
    {
      message: "Unsupported language",
    }
  );

export const geoOnboardingBrandInputSchema = geoOrganizationInputSchema.extend({
  companyName: string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  aliases: array(string().trim().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH)).max(
    GEO_MAX_ALIASES
  ),
  prompts: array(
    object({
      prompt: string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
      title: string().trim().min(1).max(GEO_GAP_TITLE_MAX_LENGTH),
    })
  ).max(GEO_ONBOARDING_MAX_PROMPTS),
  languages: geoTrackingLanguagesSchema.optional(),
  engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .min(1)
    .max(GEO_MAX_ENGINES)
    .optional(),
  enforceZdr: boolean().optional(),
  nonZdrApprovedEngines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .max(GEO_MAX_ENGINES)
    .optional(),
});

export const geoCompetitorSuggestionsInputSchema =
  geoOrganizationInputSchema.extend({
    domain: geoCompetitorDomainSchema.refine((value) => value !== null, {
      message: "Enter a domain like example.com",
    }),
  });

export const geoCompetitorSuggestionsResponseSchema = object({
  domain: string().min(1),
  field: string().nullable(),
  competitors: array(
    object({
      name: string().min(1),
      domain: string().nullable(),
      description: string().nullable(),
      confidence: enumType(["high", "medium"]).nullable(),
    })
  ),
});

export const geoBrandSearchInputSchema = geoOrganizationInputSchema.extend({
  query: string()
    .trim()
    .min(GEO_BRAND_SEARCH_MIN_QUERY_LENGTH)
    .max(GEO_BRAND_SEARCH_MAX_QUERY_LENGTH),
});

export const geoWebsiteDiscoverySchema = object({
  companyName: string().min(1),
  aliases: array(string().min(1)).max(GEO_DISCOVERY_MAX_ALIASES),
  competitors: array(
    object({
      name: string().min(1),
      domain: string().nullable(),
    })
  )
    .min(GEO_DISCOVERY_MIN_COMPETITORS)
    .max(GEO_DISCOVERY_MAX_COMPETITORS),
  prompts: array(
    object({
      prompt: string().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
      title: string().min(1).max(GEO_GAP_TITLE_MAX_LENGTH),
    })
  )
    .min(GEO_DISCOVERY_MIN_PROMPTS)
    .max(GEO_DISCOVERY_MAX_PROMPTS),
});

export const geoJudgeResultSchema = object({
  mentioned: boolean(),
  position: number().nullable(),
  sentiment: enumType(["positive", "neutral", "negative"]).nullable(),
  competitors: array(string()).max(MAX_JUDGE_COMPETITORS),
  excerpt: string().max(MAX_EXCERPT_LENGTH),
});

export const aiTrafficInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_LOG_LIMIT).optional(),
});

export const geoTrafficLogInputSchema = geoOrganizationInputSchema.extend({
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_LOG_LIMIT).optional(),
  visitorTypes: array(enumType(["crawler", "ai_referral"]))
    .max(MAX_GEO_TRAFFIC_LOG_FILTER_VALUES)
    .optional(),
  categories: array(
    enumType(["training-crawler", "search-index", "assistant-browse"])
  )
    .max(MAX_GEO_TRAFFIC_LOG_FILTER_VALUES)
    .optional(),
});

export const geoRequestPayloadSchema = object({
  timestamp: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  method: string().min(1).max(MAX_GEO_METHOD_LENGTH),
  url: string().min(1).max(MAX_GEO_URL_LENGTH),
  ip: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  geo: object({
    country: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
    region: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
    city: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
    timezone: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
    latitude: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
    longitude: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  }).optional(),
  referer: string().max(MAX_GEO_URL_LENGTH).optional(),
  userAgent: string().max(MAX_GEO_FIELD_LENGTH).optional(),
  accept: string().max(MAX_GEO_FIELD_LENGTH).optional(),
  acceptLanguage: string().max(MAX_GEO_FIELD_LENGTH).optional(),
  requestId: string().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  signals: object({
    clientHints: boolean(),
    fetchMode: string().max(GEO_SHORT_FIELD_MAX_LENGTH).nullable(),
    tracing: boolean(),
  }).optional(),
});

export const geoTrafficJourneysInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_JOURNEYS_LIMIT).optional(),
});

export const geoJourneyDetailInputSchema = geoOrganizationInputSchema.extend({
  journeyId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  ...geoWindowFields,
});

export const geoTrafficPagesInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_PAGES_LIMIT).optional(),
  visitorType: enumType(["crawler", "ai_referral"]).optional(),
});

export const geoWriterPlanInputSchema = geoOrganizationInputSchema.extend({
  topic: string()
    .trim()
    .min(GEO_WRITER_TOPIC_MIN_LENGTH)
    .max(GEO_WRITER_TOPIC_MAX_LENGTH),
  autoApprove: boolean().default(false),
  contentSubtype: geoContentSubtypeSchema.optional(),
  brandVoiceIds: array(string().min(1)).max(8).optional(),
  competitorIds: array(string().min(1)).max(GEO_MAX_COMPETITORS).optional(),
  sitemapId: string().min(1).optional(),
  sourceKind: enumType([
    "manual",
    "gap",
    "prompt",
    "search_console",
  ]).optional(),
  sourceId: string().min(1).optional(),
  existingPageUrl: url().max(GEO_EXISTING_PAGE_URL_MAX_LENGTH).optional(),
});

export const geoWriterBriefIdInputSchema = geoOrganizationInputSchema.extend({
  briefId: string().min(1),
});

export const geoWriterUpdateInputSchema = geoWriterBriefIdInputSchema.extend({
  expectedUpdatedAt: string().datetime(),
  markdown: string().trim().min(1).max(POST_MARKDOWN_MAX_LENGTH),
  workingTitle: string()
    .trim()
    .min(1)
    .max(GEO_BRIEF_MAX_TITLE_LENGTH)
    .optional(),
});

export const geoWriterWorkflowPayloadSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1),
  briefId: string().min(1),
  runId: string().min(1),
});

export const geoSuggestionIdInputSchema = object({
  organizationId: string().min(1),
  suggestionId: string().min(1),
});
