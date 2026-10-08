import { GEO_BRIEF_MAX_TITLE_LENGTH } from "@notra/ai/constants/geo-writer";
import { SUPPORTED_LANGUAGES } from "@notra/ai/constants/languages";
import { geoContentSubtypeSchema } from "@notra/ai/schemas/geo-writer";
import { POST_MARKDOWN_MAX_LENGTH } from "@notra/ai/schemas/limits";
import {
  array,
  boolean,
  enum as enumType,
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
  GEO_GENERATED_CONVERSATION_MAX_TURNS,
  GEO_GENERATED_CONVERSATIONS_MAX,
  GEO_CONVERSION_PATH_MAX_LENGTH,
  GEO_MAX_ALIASES,
  GEO_MAX_COMPETITORS,
  GEO_MAX_CONVERSION_PATHS,
  GEO_MAX_DOMAINS,
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
import { MAX_JUDGE_COMPETITORS } from "../constants/geo-conversations";
import { GEO_CSV_IMPORT_MAX_ROWS } from "../constants/geo-import";
import { GEO_AUDIENCE_TYPES } from "../constants/geo-model-catalog";
import { normalizeProjectDomain } from "../utils/geo-project-domains";
import { normalizePromptTags } from "../utils/geo-prompt-tags";
import {
  geoCompetitorDomainSchema,
  geoCompetitorImportRowSchema,
  geoPromptImportRowSchema,
} from "./geo-import";
import { geoOrganizationInputSchema } from "./geo-scope";
import { publicWebsiteUrlSchema } from "./url";

const GEO_SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);
const MAX_GEO_TRAFFIC_LOG_FILTER_VALUES = 3;
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

export const geoModelCatalogInputSchema = object({
  organizationId: string().min(1),
});

export const geoSettingsEngineAddInputSchema =
  geoOrganizationInputSchema.extend({
    engine: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  });

const geoSupportedLanguageSchema = string()
  .min(1)
  .refine((value) => GEO_SUPPORTED_LANGUAGE_SET.has(value), {
    message: "Unsupported language",
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

export const geoSettingsLanguageAddInputSchema =
  geoOrganizationInputSchema.extend({
    language: geoSupportedLanguageSchema,
  });

export const geoConversionPathSchema = string()
  .trim()
  .min(1)
  .max(GEO_CONVERSION_PATH_MAX_LENGTH)
  .refine((value) => value.startsWith("/"), {
    message: "Conversion paths must start with /",
  });

export const geoProjectDomainSchema = string()
  .trim()
  .min(1)
  .max(GEO_SHORT_FIELD_MAX_LENGTH)
  .refine((value) => normalizeProjectDomain(value) !== null, {
    message: "Enter a domain like example.com",
  });

export const geoSettingsUpsertInputSchema = geoOrganizationInputSchema.extend({
  companyName: string().min(1),
  aliases: array(string().min(1)).max(GEO_MAX_ALIASES),
  competitors: array(string().min(1)).max(GEO_MAX_COMPETITORS),
  conversionPaths: array(geoConversionPathSchema)
    .max(GEO_MAX_CONVERSION_PATHS)
    .optional(),
  domains: array(geoProjectDomainSchema).max(GEO_MAX_DOMAINS).optional(),
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
  trackWithoutSearch: boolean().optional(),
  pausedAutoPromptIds: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .max(GEO_MAX_PROMPTS)
    .optional(),
  removedAutoPromptIds: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
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
    summaryOnly: boolean().optional(),
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
  /** Tracked languages; the first one is the language prompts are written in. */
  languages: geoTrackingLanguagesSchema.optional(),
});

export const geoProjectDeleteInputSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1),
});

export const geoProjectUpdateInputSchema = geoProjectDeleteInputSchema.extend({
  brandSettingsId: string().min(1),
});

export const geoPromptResultDetailInputSchema =
  geoOrganizationInputSchema.extend({
    checkId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  });

export const geoPromptHistoryInputSchema = geoOrganizationInputSchema.extend({
  scanId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
  promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
});

export const geoScanStatusInputSchema = geoOrganizationInputSchema.extend({
  scanId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
});

export const geoPromptRescanInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .min(1)
    .max(GEO_MAX_ENGINES)
    .optional(),
});

export const geoPromptGapIgnoreInputSchema = geoOrganizationInputSchema.extend({
  promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  ignored: boolean(),
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

export const geoDiscoverWebsiteInputSchema =
  geoGenerateFromWebsiteInputSchema.extend({
    language: geoSupportedLanguageSchema.optional(),
  });

export const geoOnboardingBrandInputSchema = geoOrganizationInputSchema
  .extend({
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
    promptLanguage: geoSupportedLanguageSchema.optional(),
    audienceType: enumType(GEO_AUDIENCE_TYPES).optional(),
    engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
      .min(1)
      .max(GEO_MAX_ENGINES)
      .optional(),
    enforceZdr: boolean().optional(),
    nonZdrApprovedEngines: array(
      string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH)
    )
      .max(GEO_MAX_ENGINES)
      .optional(),
  })
  .refine(
    (input) =>
      !(input.promptLanguage && input.languages) ||
      input.languages.includes(input.promptLanguage),
    {
      message: "The prompt language must be one of the tracked languages",
      path: ["promptLanguage"],
    }
  );

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

/**
 * Lenient on purpose: generated conversations are filtered after the call, so
 * one badly sized turn never fails the whole website analysis.
 */
export const geoGeneratedConversationSchema = object({
  name: string().min(1),
  steps: array(string().min(1)).max(GEO_GENERATED_CONVERSATION_MAX_TURNS),
});

export const geoConversationGenerationSchema = object({
  conversations: array(geoGeneratedConversationSchema).max(
    GEO_GENERATED_CONVERSATIONS_MAX
  ),
});

export const geoWebsiteDiscoverySchema = object({
  companyName: string().min(1),
  aliases: array(string().min(1)).max(GEO_DISCOVERY_MAX_ALIASES),
  audienceType: enumType(GEO_AUDIENCE_TYPES),
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
  conversations: array(geoGeneratedConversationSchema).max(
    GEO_GENERATED_CONVERSATIONS_MAX
  ),
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
  host: string().trim().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
});

export const webAnalyticsInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  host: string().trim().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
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
  host: string().trim().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
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
  status: number().int().min(100).max(599).optional(),
  signals: object({
    clientHints: boolean(),
    fetchMode: string().max(GEO_SHORT_FIELD_MAX_LENGTH).nullable(),
    tracing: boolean(),
    prefetch: boolean().optional(),
  }).optional(),
});

export const geoTrafficJourneysInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_JOURNEYS_LIMIT).optional(),
});

export const geoJourneyStatsInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
});

export const geoJourneyDetailInputSchema = geoOrganizationInputSchema.extend({
  journeyId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
  ...geoWindowFields,
});

export const geoTrafficPagesInputSchema = geoOrganizationInputSchema.extend({
  ...geoWindowFields,
  limit: number().int().min(1).max(MAX_AI_TRAFFIC_PAGES_LIMIT).optional(),
  visitorType: enumType(["crawler", "ai_referral"]).optional(),
  host: string().trim().max(GEO_SHORT_FIELD_MAX_LENGTH).optional(),
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
    "ai_search",
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

export const geoSuggestionIdInputSchema = geoOrganizationInputSchema.extend({
  suggestionId: string().min(1),
});

export const geoPromptTranslationTargetInputSchema =
  geoOrganizationInputSchema.extend({
    promptId: string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH),
    language: geoSupportedLanguageSchema,
  });

export const geoPromptTranslationSelectInputSchema =
  geoPromptTranslationTargetInputSchema.extend({ selected: boolean() });

export const geoPromptTranslationUpdateInputSchema =
  geoPromptTranslationTargetInputSchema.extend({
    text: string().trim().min(1).max(MAX_PROMPT_LENGTH),
  });
