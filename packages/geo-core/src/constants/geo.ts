import type {
  AiTrafficResponse,
  EngineIconKey,
  GeoChangeKind,
  GeoChangesSummary,
  GeoChangesSummaryGroup,
  GeoChatSkin,
  GeoCompetitor,
  GeoCompetitorShareTimeseriesPoint,
  GeoGroundedProvider,
  GeoGroundedProviderConfig,
  GeoIngestFramework,
  GeoIngestPackageManager,
  GeoJourneyPathKind,
  GeoPromptIntent,
  GeoPromptIntentRule,
  GeoPromptResultSummary,
  GeoRangePreset,
  GeoSearchGapAction,
  GeoTab,
  GeoTimeseriesPoint,
  GeoTrafficFunnelStage,
  GeoTrafficLogPurposeOption,
  GeoTrafficLogVisitorOption,
  GeoTrafficSourceGroupDefinition,
  GeoVisitorType,
} from "../types/geo";
import {
  GEO_MODEL_CATALOG_SEED,
  GEO_MODEL_CATALOG_STATIC,
} from "./geo-model-catalog";

export const GEO_MAX_ENGINES = 64;
export const GEO_MODEL_CATALOG_STALE_MS = 60 * 60 * 1000;

export const GEO_JUDGE_MODEL = "openai/gpt-5.4-nano";

export const GEO_OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
export const GEO_ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
export const GEO_PERPLEXITY_API_KEY_ENV = "PERPLEXITY_API_KEY";
export const GEO_CURSOR_API_KEY_ENV = "CURSOR_API_KEY";
export const GEO_SERPAPI_API_KEY_ENV = "SERPAPI_API_KEY";

/** Catalog id of the Cursor engine; the SDK model id is the slug part. */
export const GEO_CURSOR_ENGINE_ID = "cursor/composer-2.5";
export const GEO_CURSOR_MODEL_ID = "composer-2.5";
export const GEO_OPENCODE_ENGINE_ID = "opencode/gpt-5.6-sol-medium";
export const GEO_CLAUDE_CODE_ENGINE_IDS = [
  "claude-code/claude-fable-5.1",
  "claude-code/claude-opus-5",
] as const;
export const GEO_CODEX_ENGINE_IDS = [
  "codex/gpt-6-astra",
  "codex/gpt-5.6-sol-rei",
] as const;
export const GEO_CODING_AGENT_ENGINE_IDS = [
  ...GEO_CLAUDE_CODE_ENGINE_IDS,
  ...GEO_CODEX_ENGINE_IDS,
] as const;
export const GEO_AI_OVERVIEW_ENGINE_ID = "google/ai-overview";
export const GEO_PROVIDER_TIMEOUT_MS = 120_000;
export const GEO_ANSWER_TIMEOUT_MS = 180_000;
export const GEO_CURSOR_TIMEOUT_MS = GEO_ANSWER_TIMEOUT_MS;
export const GEO_AI_OVERVIEW_TIMEOUT_MS = GEO_ANSWER_TIMEOUT_MS;
/** Databuddy flag that exposes the Cursor engine to an organization. */
export const GEO_CURSOR_FLAG_KEY = "geo-cursor";
/** Databuddy flag that exposes OpenCode, Claude Code, and Codex. */
export const GEO_OPENCODE_FLAG_KEY = "geo-opencode";
export const GEO_FLAG_CACHE_TTL_MS = 60_000;
export const GEO_FLAG_STALE_TIME_MS = 30_000;
export const GEO_FLAG_ERROR_REASON = "ERROR";

export const GEO_WRITER_NAV_LINK = "/geo/write";
export const GEO_GAPS_NAV_LINK = "/geo/gaps";
export const GEO_PROMPTS_NAV_LINK = "/geo/prompts";
export const GEO_AGENT_READINESS_NAV_LINK = "/geo/agent-readiness";
export const GEO_WRITER_TOPIC_MIN_LENGTH = 3;
export const GEO_WRITER_TOPIC_MAX_LENGTH = 8000;
export const GEO_WRITER_GAP_LOOKBACK_DAYS = 30;
export const GEO_WRITER_PLANNER_GAP_LIMIT = 20;
export const GEO_WRITER_EVIDENCE_MAX_ENGINES = 24;
export const GEO_WRITER_EVIDENCE_MAX_ITEMS = 8;
export const GEO_WRITER_SITEMAP_PAGE_LIMIT = 60;
export const GEO_WRITER_BRIEF_POLL_INTERVAL_MS = 3000;
export const GEO_WRITER_BRIEFS_LIMIT = 20;
export const GEO_GAPS_MAX_CHECKS = 400;
export const GEO_GAPS_SEARCH_LIMIT = 100;
export const GEO_GAPS_ENGINE_QUERY_LIMIT = 12;
export const GEO_AI_SEARCH_GAP_MIN_SEARCHES = 2;
export const GEO_AI_SEARCH_GAP_MAX_QUERIES = 5000;
export const GEO_AI_SEARCH_GAP_VARIANT_LIMIT = 5;
export const GEO_AI_SEARCH_GAP_PROMPT_LIMIT = 5;
export const GEO_AI_SEARCH_QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "best",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "top",
  "vs",
  "with",
]);
/** Fallback before the gaps table measures remaining viewport height. */
export const GEO_GAPS_TABLE_HEIGHT = 420;
export const GEO_GAPS_METER_STEPS = 5;
export const GEO_GAPS_COMPETITOR_SIGNAL_CAP = 4;
export const GEO_GAPS_METER_TONE_CLASS = {
  empty: "bg-muted",
  low: "bg-geo-down",
  mid: "bg-geo-mid",
  high: "bg-geo-up",
} as const;
export const GEO_GAPS_LOGO_STACK_LIMIT = 4;
export const GEO_GAPS_TABLE_LOGO_LIMIT = 3;
export const GEO_EXISTING_PAGE_URL_MAX_LENGTH = 2048;
export const GEO_SEARCH_GAP_MIN_IMPRESSIONS = 25;
export const GEO_COLLISION_STRONG_SCORE = 0.55;
export const GEO_COLLISION_PARTIAL_SCORE = 0.35;
export const GEO_COLLISION_MERGE_TARGET_LIMIT = 3;
export const GEO_COLLISION_MIN_TOKEN_LENGTH = 3;
export const GEO_COLLISION_ORDERED_TITLE_BONUS = 0.15;
export const GEO_COLLISION_SITEMAP_PAGE_LIMIT = 400;
export const GEO_COLLISION_POST_LIMIT = 300;
export const GEO_COLLISION_POST_CONTENT_TYPE = "blog_post";
export const GEO_COLLISION_STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "best",
  "between",
  "but",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "has",
  "have",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "make",
  "more",
  "most",
  "my",
  "need",
  "not",
  "of",
  "on",
  "one",
  "or",
  "our",
  "should",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "top",
  "use",
  "used",
  "using",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);
export const GEO_SEARCH_GAP_ACTION_ORDER: Record<GeoSearchGapAction, number> = {
  create: 0,
  update: 1,
  merge: 2,
  ignore: 3,
};
export const GEO_SEARCH_GAP_ACTION_CLASS: Record<GeoSearchGapAction, string> = {
  create: "border-geo-up/30 bg-geo-up/10 text-geo-up",
  update: "border-geo-mid/30 bg-geo-mid/10 text-geo-mid",
  merge: "border-geo-mid/30 bg-geo-mid/10 text-geo-mid",
  ignore: "border-border bg-muted/70 text-muted-foreground",
};
export const GEO_GAPS_ENGINE_FILTER_ALL = "all";
export const GEO_WRITER_TRIGGER_ID = "geo_writer";
export const GEO_WRITER_TRIGGER_NAME = "GEO Writer";

export const GEO_WRITE_SIDEBAR_SHORTCUT = "b";
export const GEO_WRITE_PANEL_HEADER_CLASS =
  "overflow-hidden rounded-t-2xl border border-border border-b-0 bg-muted pb-5";
export const GEO_WRITE_PANEL_HEADER_ROW_CLASS = "flex h-10 items-center";
export const GEO_WRITE_PANEL_FOOTER_CLASS =
  "-mt-5 overflow-hidden rounded-b-2xl border border-border border-t-0 bg-muted pt-5";
export const GEO_WRITE_PANEL_FOOTER_ROW_CLASS = "flex min-h-12 items-center";
export const GEO_WRITE_SIDEBAR_WIDTH = "13rem";
export const GEO_WRITE_SITEMAP_SKELETON_KEYS = ["sitemap-1", "sitemap-2"];
export const GEO_WRITE_TABLE_HEIGHT = 420;
export const GEO_WRITE_TABLE_ROW_HEIGHT = 56;
export const GEO_WRITE_TABLE_MIN_ROWS = 4;
const hasEnv = (name: string): boolean => {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
};

export const GEO_GROUNDED_PROVIDERS: readonly GeoGroundedProviderConfig[] = [
  {
    provider: "gateway-openai",
    zdr: "some",
    envVar: null,
    isAvailable: () => true,
  },
  {
    provider: "gateway-anthropic",
    zdr: "all",
    envVar: null,
    isAvailable: () => true,
  },
  {
    provider: "gateway-google",
    zdr: "some",
    envVar: null,
    isAvailable: () => true,
  },
  {
    provider: "gateway-perplexity",
    zdr: "none",
    envVar: null,
    isAvailable: () => true,
  },
  {
    provider: "direct-openai",
    zdr: "none",
    envVar: GEO_OPENAI_API_KEY_ENV,
    isAvailable: () => hasEnv(GEO_OPENAI_API_KEY_ENV),
  },
  {
    provider: "direct-anthropic",
    zdr: "none",
    envVar: GEO_ANTHROPIC_API_KEY_ENV,
    isAvailable: () => hasEnv(GEO_ANTHROPIC_API_KEY_ENV),
  },
  {
    provider: "direct-perplexity",
    zdr: "none",
    envVar: GEO_PERPLEXITY_API_KEY_ENV,
    isAvailable: () => hasEnv(GEO_PERPLEXITY_API_KEY_ENV),
  },
];

/** Grounded engines that call the vendor SDK directly, outside the router. */
export const GEO_DIRECT_GROUNDED_PROVIDERS: ReadonlySet<GeoGroundedProvider> =
  new Set<GeoGroundedProvider>([
    "direct-openai",
    "direct-anthropic",
    "direct-perplexity",
  ]);

// Decode historical records and queued tasks only; never used to select models.
export const GEO_LEGACY_GROUNDED_MODELS: Readonly<Record<string, string>> = {
  "openai-direct-grounded": "openai/gpt-5.4",
  "anthropic-direct-grounded": "anthropic/claude-sonnet-4.6",
  "perplexity-sonar": "perplexity/sonar",
};

const groundedEngineLabels: Record<string, string> = {
  "openai/gpt-5.4-grounded": "GPT-5.4",
  "anthropic/claude-sonnet-4.6-grounded": "Claude Sonnet 4.6",
  "google/gemini-3-flash-grounded": "Gemini 3 Flash",
  "openai-direct-grounded": "GPT-5.4",
  "anthropic-direct-grounded": "Claude Sonnet 4.6",
  "perplexity-sonar": "Sonar",
};

const catalogEngineLabels = Object.fromEntries(
  [...GEO_MODEL_CATALOG_SEED, ...GEO_MODEL_CATALOG_STATIC].map((entry) => [
    entry.id,
    entry.label,
  ])
);

export const GEO_ENGINE_LABELS: Record<string, string> = {
  ...catalogEngineLabels,
  ...groundedEngineLabels,
};

export const GEO_BRAND_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google: "Google",
  amazon: "Amazon",
  perplexity: "Perplexity",
  cursor: "Cursor",
  opencode: "OpenCode",
  "claude-code": "Claude Code",
  codex: "Codex",
  copilot: "Copilot",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  meta: "Meta",
  grok: "Grok",
  kimi: "Kimi",
  moonshot: "Kimi",
  zai: "GLM",
  qwen: "Qwen",
  tencent: "Hunyuan",
  xiaomi: "Xiaomi",
};

export const GEO_MAX_PROMPTS = 8;
export const GEO_MAX_SEQUENCES = 10;
export const GEO_COMPETITOR_SHARE_LIMIT = 50;
export const GEO_PROMPT_HISTORY_LIMIT = 120;
export const GEO_PROMPT_HISTORY_SKELETON_ROWS = 4;
/** Named brands shown in the scan-history "New brands" cell before +N. */
export const GEO_PROMPT_HISTORY_NEW_COMPETITORS_VISIBLE = 3;
export const GEO_PROMPT_HISTORY_EMPTY_POSITION = "\u2013";
export const GEO_PROMPT_HISTORY_EMPTY_COMPETITORS = "\u2013";
export const GEO_SHARE_OF_VOICE_TOP_BRANDS = 5;
export const GEO_SHARE_OF_VOICE_PAGE_TOP_BRANDS = 8;
export const GEO_VISIBILITY_TABLE_ROWS = GEO_SHARE_OF_VOICE_TOP_BRANDS + 1;
export const GEO_SEQUENCE_MAX_TURNS = 5;
/** Conversations generated at setup or on demand; small on purpose, every turn is a check per engine in each scan. */
export const GEO_GENERATED_CONVERSATIONS_MAX = 3;
/** Website setup asks for fewer than the on-demand maximum: the brand is still unverified at that point. */
export const GEO_DISCOVERY_CONVERSATIONS = 2;
export const GEO_GENERATED_CONVERSATION_MIN_TURNS = 3;
export const GEO_GENERATED_CONVERSATION_MAX_TURNS = 4;
export const GEO_GENERATED_CONVERSATION_NAME_MAX_LENGTH = 48;
export const GEO_CONVERSATION_GENERATION_MAX_TOKENS = 2000;
export const GEO_CONVERSATION_CONTEXT_PROMPT_LIMIT = 12;
export const GEO_GROUNDED_MAX_SEARCHES = 3;
export const GEO_ANSWER_MAX_TOKENS = 4096;
export const GEO_GROUNDED_ANSWER_MAX_TOKENS = 4096;
export const GEO_JUDGE_MAX_TOKENS = 800;
export const GEO_SCAN_CONCURRENCY = 4;
export const GEO_SCAN_DEFAULT_INTERVAL_HOURS = 24;
export const GEO_SCAN_INTERVAL_OPTIONS = [
  {
    value: GEO_SCAN_DEFAULT_INTERVAL_HOURS,
    label: "Every day",
    short: "Daily",
  },
  { value: 48, label: "Every 48 hours", short: "48 hours" },
  { value: 3 * 24, label: "Every 3 days", short: "3 days" },
  { value: 7 * 24, label: "Every week", short: "Weekly" },
  { value: 14 * 24, label: "Every 2 weeks", short: "2 weeks" },
  { value: 30 * 24, label: "Every 30 days", short: "30 days" },
] as const;
export const GEO_SCAN_INTERVAL_HOURS = GEO_SCAN_INTERVAL_OPTIONS.map(
  (option) => option.value
);
export const GEO_SCAN_HOURS_PER_DAY = 24;
export const GEO_SCAN_MIN_INTERVAL_DAYS = 1;
export const GEO_SCAN_MAX_INTERVAL_DAYS = 90;
export const GEO_SCAN_MIN_INTERVAL_HOURS =
  GEO_SCAN_MIN_INTERVAL_DAYS * GEO_SCAN_HOURS_PER_DAY;
export const GEO_SCAN_MAX_INTERVAL_HOURS =
  GEO_SCAN_MAX_INTERVAL_DAYS * GEO_SCAN_HOURS_PER_DAY;
export const GEO_SCAN_CUSTOM_INTERVAL_VALUE = "custom";
export const GEO_SCAN_INTERVAL_LABEL_PREFIX = /^Every\s+/;
export const GEO_SCAN_INTERVAL_FALLBACK_NOUN = "scan interval";
export const GEO_SCAN_NO_RESULTS_RETRY_DELAY = "5m";
export const GEO_SCAN_STALE_MS = 2 * 60 * 60 * 1000;
export const GEO_SCAN_START_RETRY_WINDOW_MS = 12 * 60 * 60 * 1000;
/**
 * How long a cron sweep owns a due schedule row before another sweep may
 * retry it. A tick whose scan did not provably start keeps this lease instead
 * of jumping a full interval, so a failed hand-off costs minutes, not a day.
 */
export const GEO_SCAN_START_LEASE_MS = 15 * 60 * 1000;
export const GEO_SCAN_TASK_BATCH_SIZE = GEO_SCAN_CONCURRENCY;
/**
 * Batch steps a project scan runs side by side. Projects run sequentially, so
 * multiplied by the batch size this also bounds one workflow's provider and
 * judge traffic (currently eight concurrent checks).
 */
export const GEO_SCAN_BATCH_CONCURRENCY = 2;
export const GEO_SCAN_CLAIM_RENEW_AFTER_MS = 30 * 60 * 1000;
export const GEO_SCAN_SEQUENCE_BATCH_SIZE = 3;
export const GEO_SEQUENCE_PAIR_TIMEOUT_MS = 7 * 60 * 1000;
export const GEO_SCAN_DUE_LIMIT_PER_SWEEP = 25;
export const GEO_SCAN_POLL_INTERVAL_MS = 3000;
export const GEO_START_SCAN_MUTATION_KEY = "geo-start-scan";
export const GEO_RESCAN_SOURCE_KINDS = ["gap", "prompt"] as const;
export const GEO_GAPS_LIFT_NOW_LABEL = "now";
export const GEO_GAPS_LIFT_TONE_CLASS = {
  up: "text-geo-up",
  down: "text-geo-down",
  flat: "text-muted-foreground",
} as const;
export const GEO_EXCERPT_MAX_LENGTH = 300;
export const GEO_PROMPT_MIN_LENGTH = 8;
export const GEO_PROMPT_MAX_LENGTH = 300;
export const GEO_PROMPT_MAX_TAGS = 20;
export const GEO_PROMPT_TAG_MAX_LENGTH = 40;
export const GEO_PROMPT_TAG_SEPARATOR_REGEX = /[\s,]+/;
export const GEO_PROMPT_INTENTS = [
  "comparison",
  "list",
  "how_to",
  "question",
  "other",
] as const satisfies readonly GeoPromptIntent[];
export const GEO_PROMPT_INTENT_RULES: readonly GeoPromptIntentRule[] = [
  {
    intent: "comparison",
    pattern:
      /\b(vs\.?|versus|compare|comparison|compared|alternatives?|instead of|better than)\b/i,
  },
  {
    intent: "how_to",
    pattern:
      /\b(how (?:do|can|to|should)|steps?|guide|tutorial|set ?up|get started|implement|configure|install)\b/i,
  },
  {
    intent: "list",
    pattern:
      /\b(best|top|list|options|tools|examples|recommend(?:ed|ations?)?|which|what (?:tools?|platforms?|software|services?|apps?|products?|companies))\b/i,
  },
  {
    intent: "question",
    pattern: /^(what|why|when|where|who|is|are|does|do|can|should|will)\b|\?/i,
  },
];
export const GEO_GAP_TITLE_MAX_LENGTH = 160;
export const GEO_DISCOVERY_MODEL = "anthropic/claude-sonnet-4.6";
export const GEO_DISCOVERY_MAX_TOKENS = 5000;
export const GEO_DISCOVERY_MAX_ALIASES = 6;
export const GEO_DISCOVERY_MIN_COMPETITORS = 5;
export const GEO_DISCOVERY_MAX_COMPETITORS = 10;
export const GEO_DISCOVERY_MIN_PROMPTS = 10;
export const GEO_DISCOVERY_MAX_PROMPTS = 14;
export const GEO_DISCOVERY_ALIAS_LIMIT = 8;
export const GEO_DISCOVERY_COMPETITOR_LIMIT = 12;
export const GEO_DISCOVERY_CACHE_PREFIX = "geo:discovery:v1";
export const GEO_DISCOVERY_CACHE_TTL_SECONDS = 60 * 60;
export const GEO_COMPETITOR_SUGGESTIONS_CACHE_PREFIX =
  "geo:competitor-suggestions:v1";
export const GEO_INGEST_IDENTITY_CACHE_PREFIX = "geo:ingest-identity:v1";
export const GEO_INGEST_HOSTS_CACHE_PREFIX = "geo:ingest-hosts:v2";
export const GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS = 5 * 60;
export const GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS = 60;
export const GEO_ONBOARDING_MAX_PROMPTS = 30;
export const GEO_ONBOARDING_SUGGESTED_COMPETITORS = 10;
export const GEO_BRAND_SEARCH_MIN_QUERY_LENGTH = 2;
export const GEO_BRAND_SEARCH_MAX_QUERY_LENGTH = 100;
export const GEO_BRAND_SEARCH_DEBOUNCE_MS = 300;
export const GEO_BRAND_SEARCH_STALE_MS = 5 * 60 * 1000;
export const GEO_TRACKED_PROMPT_VOICE =
  'Write each prompt as the literal message a real person would type into ChatGPT: lowercase, one intent, no trailing question mark, 6 to 18 words, most of them under 14. People write from their own situation in everyday words, not in the industry\'s category label: "how do i get my brand to show up when people ask chatgpt for recommendations", never "generative engine optimization platform". Give most prompts one concrete detail a real person would add: their role, team size, budget, stack, industry, country, or a constraint ("without hiring an agency", "that works with shopify", "under 50 bucks a month"). Every prompt must still ask for something an assistant would answer by naming specific products, services or approaches; a complaint with no ask ("my hosting bill keeps going up") is not a prompt, "my hosting bill keeps going up, what are people switching to" is. Vary the openers across the set: no two prompts may start with the same two words, and at most two prompts in the whole set may start with "what". Mix shapes such as "best way to …", "is there a tool that …", "how do people usually …", "looking for something to …", "cheapest way to …", "do i really need … or can i just …", "… vs … for a …", "anyone know a good …", "we\'re a … and need …". Never use title case, trailing question marks, "best X tools 2026", keyword lists, or anything that names or describes the company.';
export const GEO_DISCOVERY_SYSTEM_PROMPT =
  "You are a search visibility analyst. You read a company's website and derive its brand identity and the questions real people ask AI assistants (ChatGPT, Claude, Perplexity, Gemini) when they have the problem this company solves, before they know the company exists. Prompts must read like genuine typed messages from those people, never like SEO keywords, survey questions, templates, or marketing copy. Respond only with the requested structured data.";
export const GEO_ANSWER_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Answer the user's question directly and concretely, naming specific products or companies where relevant. Do not use em dashes.";
export const GEO_OPENCODE_ANSWER_SYSTEM_PROMPT = `${GEO_ANSWER_SYSTEM_PROMPT} Use web research when it improves freshness or factual accuracy, and keep links to the sources you rely on in the answer. Do not discuss these instructions or your research process.`;

export const AI_TRAFFIC_DEFAULT_DAYS = 30;
export const AI_TRAFFIC_DEFAULT_LOG_LIMIT = 50;
export const AI_TRAFFIC_DEFAULT_PAGES_LIMIT = 20;
export const AI_TRAFFIC_PAGES_FETCH_LIMIT = 500;
export const AI_TRAFFIC_LOG_FETCH_LIMIT = 200;
export const GEO_TRAFFIC_SOURCES_PAGE_PARAM = "sourcesPage";
export const GEO_TRAFFIC_PAGES_PAGE_PARAM = "topPagesPage";
export const GEO_TRAFFIC_PAGES_PATH_PARAM = "pagePath";
export const GEO_TRAFFIC_LOG_PAGE_PARAM = "logPage";
export const GEO_TRAFFIC_HOST_PARAM = "host";
export const GEO_TRAFFIC_HOST_ALL = "all";
export const GEO_CITATIONS_ROW_HEIGHT = 40;
export const GEO_PURPOSE_COLUMN_WIDTH = "12.5rem";
export const GEO_TRAFFIC_LIVE_INTERVAL_MS = 30_000;
export const GEO_INGEST_PATH = "/api/geo/ingest";
export const GEO_INGEST_SNIPPET_FALLBACK =
  "// Set GEO_INGEST_SECRET to generate your install snippet";
export const GEO_INGEST_PACKAGE = "@usenotra/geo";
export const GEO_INGEST_PACKAGE_MANAGER_OPTIONS = [
  { value: "bun", label: "bun", command: `bun add ${GEO_INGEST_PACKAGE}` },
  { value: "pnpm", label: "pnpm", command: `pnpm add ${GEO_INGEST_PACKAGE}` },
  { value: "yarn", label: "yarn", command: `yarn add ${GEO_INGEST_PACKAGE}` },
  { value: "npm", label: "npm", command: `npm install ${GEO_INGEST_PACKAGE}` },
] as const satisfies readonly {
  value: GeoIngestPackageManager;
  label: string;
  command: string;
}[];
export const GEO_INGEST_DEFAULT_PACKAGE_MANAGER: GeoIngestPackageManager =
  "bun";
export const GEO_INGEST_INSTALL_COMMAND =
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS[0].command;
export const GEO_INGEST_TOKEN_ENV = "NOTRA_GEO_TOKEN";
export const GEO_INGEST_DEFAULT_FRAMEWORK: GeoIngestFramework = "next";
export const GEO_INGEST_FRAMEWORK_OPTIONS = [
  { value: "next", label: "Next.js", file: "proxy.ts" },
  { value: "nuxt", label: "Nuxt", file: "server/middleware/geo.ts" },
  { value: "tanstack", label: "TanStack Start", file: "src/start.ts" },
  { value: "astro", label: "Astro", file: "src/middleware.ts" },
  { value: "sveltekit", label: "SvelteKit", file: "src/hooks.server.ts" },
  {
    value: "netlify",
    label: "Netlify",
    file: "netlify/edge-functions/geo.ts",
  },
] as const satisfies readonly {
  value: GeoIngestFramework;
  label: string;
  file: string;
}[];
export const GEO_INGEST_SECRET_ENV = "GEO_INGEST_SECRET";
export const GEO_INGEST_SECRET_FALLBACK_ENV = "BEACON_INGEST_SECRET";
export const GEO_INGEST_TOKEN_SEPARATOR = ".";
export const GEO_INGEST_BEARER_PREFIX = "Bearer ";
export const GEO_MAX_STORED_UA_LENGTH = 200;
export const AI_TRAFFIC_DEFAULT_JOURNEYS_LIMIT = 25;

export const OWN_BRAND_ROW_ID = "own-brand";

export const COMPETITOR_TYPE_FILTER_VALUES = [
  "all",
  "direct",
  "indirect",
] as const;

export const COMPETITORS_TABLE_HEIGHT = 420;
export const COMPETITOR_PROMPTS_TABLE_HEIGHT = 288;
export const COMPETITOR_PROMPTS_PAGE_TABLE_HEIGHT = 620;
export const COMPETITORS_TABLE_ROW_HEIGHT = 52;

export const PROMPTS_TABLE_HEIGHT = 420;
export const PROMPTS_TABLE_ROW_HEIGHT = 52;

export const GEO_JOURNEY_DEEP_CRAWL_PAGES = 10;
export const GEO_LOGO_DEBOUNCE_MS = 500;
export const GEO_COLOR_DEBOUNCE_MS = 200;
export const GEO_PROMPT_FUNNEL_TOP_POSITION = 3;

export const GEO_JOURNEY_PARAM = "ntr";
export const GEO_JOURNEY_EXPLICIT_PREFIX = "n_";
export const GEO_JOURNEY_FINGERPRINT_PREFIX = "f_";
export const GEO_JOURNEY_BUCKET_SECONDS = 1800;
export const GEO_JOURNEY_BROWSE_BUCKET_SECONDS = 600;
export const GEO_JOURNEY_BROWSE_CATEGORY = "assistant-browse";
export const GEO_JOURNEY_HASH_LENGTH = 16;
export const GEO_JOURNEY_IPV4_OCTETS = 3;
export const GEO_JOURNEY_IPV6_GROUPS = 4;
export const GEO_JOURNEY_CHIP_LENGTH = 6;
export const GEO_JOURNEY_DETAIL_LIMIT = 200;
/** Pages returned by the journey stats query, busiest first. */
export const GEO_JOURNEY_PAGES_LIMIT = 500;
/** Newest journeys loaded for drill-down lists; totals come from journey stats. */
export const GEO_JOURNEY_RECENT_LIMIT = 100;

export const GEO_AI_REFERRER_HOSTS: Record<string, string> = {
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "www.perplexity.ai": "perplexity",
  "gemini.google.com": "gemini",
  "bard.google.com": "gemini",
  "claude.ai": "claude",
  "copilot.microsoft.com": "copilot",
  "www.bing.com/chat": "copilot",
  "you.com": "you",
  "chat.deepseek.com": "deepseek",
  "chat.mistral.ai": "mistral",
  "grok.com": "grok",
  "x.ai": "grok",
  "chat.qwen.ai": "qwen",
  "meta.ai": "meta",
  "www.meta.ai": "meta",
};

export const GEO_SOURCE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  openai: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
  google: "Gemini",
  claude: "Claude",
  anthropic: "Claude",
  copilot: "Copilot",
  microsoft: "Microsoft",
  you: "You.com",
  "you.com": "You.com",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  grok: "Grok",
  xai: "xAI",
  qwen: "Qwen",
  alibaba: "Alibaba",
  meta: "Meta",
  "meta-webindexer": "Meta",
  instagram: "Instagram",
  amazon: "Amazon",
  apple: "Apple",
  bytedance: "ByteDance",
  tiktok: "TikTok",
  cohere: "Cohere",
  cloudflare: "Cloudflare",
  mozilla: "Mozilla",
  duckduckgo: "DuckDuckGo",
  commoncrawl: "Common Crawl",
  kimi: "Kimi",
  moonshot: "Moonshot AI",
  huawei: "Huawei",
  baidu: "Baidu",
  kagi: "Kagi",
  exa: "Exa",
  exabot: "Exa",
  exasearchbot: "Exa",
  parallel: "Parallel",
  shapbot: "Parallel",
  "shap-user": "Parallel",
  tavily: "Tavily",
  firecrawl: "Firecrawl",
  firecrawlagent: "Firecrawl",
  diffbot: "Diffbot",
  liner: "Liner",
  timpi: "Timpi",
  cursor: "Cursor",
  opencode: "OpenCode",
  "claude-code": "Claude Code",
  "claude code": "Claude Code",
  codex: "Codex",
  devin: "Devin",
  cline: "Cline",
  manus: "Manus",
  zai: "Z.ai",
};

/** Display names for bots whose user-agent token is lowercase. */
export const GEO_AGENT_LABELS: Record<string, string> = {
  "meta-externalagent": "Meta-ExternalAgent",
  "meta-externalfetcher": "Meta-ExternalFetcher",
  "meta-webindexer": "Meta-WebIndexer",
  "meta-externalads": "Meta-ExternalAds",
  "anthropic-ai": "Anthropic-AI",
  "claude-web": "Claude-Web",
  "cohere-ai": "Cohere-AI",
  "cohere-training-data-crawler": "Cohere Training Crawler",
  "kagi-fetcher": "Kagi-Fetcher",
  omgili: "Omgili",
};

export const GEO_NON_AI_BOT_PATTERNS: readonly string[] = [
  "googlebot",
  "bingbot",
  "duckduckbot",
  "yandexbot",
  "baiduspider",
  "slurp",
  "ahrefsbot",
  "semrushbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "uptimerobot",
  "pingdom",
];

export const GEO_BROWSER_UA_PATTERNS: readonly string[] = [
  "mozilla/",
  "applewebkit",
  "chrome/",
  "safari/",
  "firefox/",
  "edg/",
  "opera",
];

export const GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT = 4;

const GEO_TRAFFIC_GOOGLE_GROUP: GeoTrafficSourceGroupDefinition = {
  key: "google",
  label: "Google",
  icon: "googlebot",
};

export const GEO_TRAFFIC_OTHER_GROUP: GeoTrafficSourceGroupDefinition = {
  key: "other",
  label: "Other",
  icon: null,
};

export const GEO_TRAFFIC_GROUPS_BY_ENGINE: Partial<
  Record<EngineIconKey, GeoTrafficSourceGroupDefinition>
> = {
  openai: { key: "openai", label: "OpenAI", icon: "openai" },
  claude: { key: "anthropic", label: "Anthropic", icon: "claude" },
  gemini: GEO_TRAFFIC_GOOGLE_GROUP,
  google: GEO_TRAFFIC_GOOGLE_GROUP,
  perplexity: { key: "perplexity", label: "Perplexity", icon: "perplexity" },
  copilot: { key: "microsoft", label: "Microsoft", icon: "copilot" },
  meta: { key: "meta", label: "Meta", icon: "meta-" },
  instagram: { key: "instagram", label: "Instagram", icon: "instagram" },
  amazon: { key: "amazon", label: "Amazon", icon: "amazonbot" },
  apple: { key: "apple", label: "Apple", icon: "applebot" },
  tiktok: { key: "bytedance", label: "ByteDance", icon: "bytespider" },
  mistral: { key: "mistral", label: "Mistral", icon: "mistral" },
  deepseek: { key: "deepseek", label: "DeepSeek", icon: "deepseek" },
  grok: { key: "xai", label: "xAI", icon: "grok" },
  qwen: { key: "alibaba", label: "Alibaba", icon: "qwen" },
  commoncrawl: { key: "commoncrawl", label: "Common Crawl", icon: "ccbot" },
  cohere: { key: "cohere", label: "Cohere", icon: "cohere" },
  duckduckgo: { key: "duckduckgo", label: "DuckDuckGo", icon: "duckduckgo" },
  opencode: { key: "opencode", label: "OpenCode", icon: "opencode" },
  cursor: { key: "cursor", label: "Cursor", icon: "cursor" },
  "claude-code": {
    key: "claude-code",
    label: "Claude Code",
    icon: "claude-code",
  },
  codex: { key: "codex", label: "Codex", icon: "codex" },
  exa: { key: "exa", label: "Exa", icon: "exasearchbot" },
  firecrawl: {
    key: "firecrawl",
    label: "Firecrawl",
    icon: "firecrawlagent",
  },
  parallel: { key: "parallel", label: "Parallel", icon: "shapbot" },
  cloudflare: {
    key: "cloudflare",
    label: "Cloudflare",
    icon: "cloudflare-autorag",
  },
  liner: { key: "liner", label: "Liner", icon: "linerbot" },
  diffbot: { key: "diffbot", label: "Diffbot", icon: "diffbot" },
  timpi: { key: "timpi", label: "Timpi", icon: "timpibot" },
  devin: { key: "devin", label: "Devin", icon: "devin" },
  cline: { key: "cline", label: "Cline", icon: "cline" },
  mozilla: { key: "mozilla", label: "Mozilla", icon: "mozilla tabstack" },
  kagi: { key: "kagi", label: "Kagi", icon: "kagi-fetcher" },
  tavily: { key: "tavily", label: "Tavily", icon: "tavilybot" },
  tencent: { key: "tencent", label: "Tencent", icon: "tencent" },
  xiaomi: { key: "xiaomi", label: "Xiaomi", icon: "xiaomi" },
  youcom: { key: "youcom", label: "You.com", icon: "youbot" },
  kimi: { key: "kimi", label: "Kimi", icon: "kimi-searchbot" },
  zai: { key: "zai", label: "Z.ai", icon: "chatglm-spider" },
  huawei: { key: "huawei", label: "Huawei", icon: "pangubot" },
  manus: { key: "manus", label: "Manus", icon: "manus-user" },
};

export const GEO_TRAFFIC_TREND_CRAWLER_KEY = "crawler";
export const GEO_TRAFFIC_TREND_REFERRAL_KEY = "aiReferral";
export const GEO_STAT_DELTA_NEW = Number.POSITIVE_INFINITY;
export const GEO_TRAFFIC_STAT_TREND_HINT =
  "vs previous period of the same length";
export const GEO_TRAFFIC_FUNNEL_STAGES: readonly GeoTrafficFunnelStage[] = [
  {
    key: "crawler",
    label: "Crawler requests",
    description: "Bots reading your pages",
  },
  {
    key: "cited",
    label: "Cited in answer",
    description:
      "Fetched while answering a question; a fetch is not proof of a citation",
  },
  {
    key: "aiReferral",
    label: "AI referrals",
    description: "People arriving from AI products",
  },
  {
    key: "conversions",
    label: "Conversions",
    description: "AI referrals that reached a conversion path",
  },
];
export const GEO_TRAFFIC_LOG_VISITOR_OPTIONS: readonly GeoTrafficLogVisitorOption[] =
  [{ value: "crawler" }, { value: "ai_referral" }];

export const GEO_UNTRACKED_VISITOR_TYPES: readonly GeoVisitorType[] = ["human"];

export const GEO_TRAFFIC_LOG_PURPOSE_OPTIONS: readonly GeoTrafficLogPurposeOption[] =
  [
    { value: "training-crawler" },
    { value: "search-index" },
    { value: "assistant-browse" },
  ];

export const GEO_JOURNEY_PATH_KINDS = [
  "home",
  "docs",
  "blog",
  "search",
  "page",
] as const;

export const GEO_JOURNEY_PATH_KIND_CLASS: Record<GeoJourneyPathKind, string> = {
  home: "border-geo-up/30 bg-geo-up/10 text-geo-up",
  docs: "border-geo-mid/30 bg-geo-mid/10 text-geo-mid",
  search: "border-geo-search/30 bg-geo-search/10 text-geo-search",
  blog: "border-geo-memory/30 bg-geo-memory/10 text-geo-memory",
  page: "border-border bg-muted/70 text-foreground",
};

export const GEO_JOURNEY_HOME_PATHS = new Set([
  "/",
  "/index",
  "/home",
  "/index.html",
]);

export const GEO_JOURNEY_DOCS_PREFIXES = [
  "/docs",
  "/documentation",
  "/api",
  "/reference",
  "/guide",
  "/guides",
  "/sdk",
  "/help",
  "/developer",
] as const;

export const GEO_JOURNEY_BLOG_PREFIXES = [
  "/blog",
  "/changelog",
  "/news",
  "/posts",
  "/articles",
  "/updates",
  "/journal",
] as const;

export const GEO_JOURNEY_SEARCH_PREFIXES = [
  "/search",
  "/query",
  "/find",
] as const;

export const GEO_JOURNEY_OVERVIEW_ROWS = 5;
export const GEO_JOURNEY_PATH_LABEL_MAX = 28;

export const GEO_PROMPT_PREVIEW_ROW_HEIGHT = 72;
export const GEO_MENTION_TREND_TOTAL_KEY = "total";
export const GEO_MENTION_TREND_TOTAL_LABEL = "All Models";
export const GEO_DEFAULT_RANGE: GeoRangePreset = "30d";
export const GEO_MENTION_TREND_LINE_KEY = "trend";
export const GEO_MENTION_TREND_AGENT_ICON_LIMIT = 4;
export const GEO_MENTION_TREND_ALL_PROVIDERS_LABEL = "All Models";
export const GEO_MENTION_SUMMARY_VISIBLE = 5;
export const GEO_MENTION_ROW_HEIGHT_REM = 2.75;
export const GEO_MENTION_FADE_HEIGHT_REM = 2;
/*
 * Visible counts `mentioned OR ownedSourceCited`, Citations counts
 * `ownedSourceCited` alone, so Citations is a subset of Visible and the two
 * never add up. Spell that out: side by side the numbers read as rival totals.
 */
export const GEO_SCAN_PREFLIGHT_PENDING = "Starting…";
export const GEO_SCAN_SIZE_WARN_THRESHOLD = 150;
export const GEO_SCAN_SIZE_DANGER_THRESHOLD = 300;
export const GEO_SCAN_SIZE_WARN =
  "Large scan. It takes longer and costs more. Use fewer engines, prompts, or languages.";
export const GEO_SCAN_SIZE_DANGER =
  "Very large scan. It will likely take a long time. Use fewer engines, prompts, or languages.";
export const GEO_SCAN_SIZE_MESSAGES = {
  warn: GEO_SCAN_SIZE_WARN,
  danger: GEO_SCAN_SIZE_DANGER,
};
export const GEO_RANGE_PRESETS = [
  { value: "today" },
  { value: "yesterday" },
  { value: "7d" },
  { value: "14d" },
  { value: "30d" },
  { value: "90d" },
  { value: "ytd" },
] as const satisfies readonly {
  value: GeoRangePreset;
}[];
export const GEO_RANGE_PRESET_DAYS = {
  today: 0,
  yesterday: 1,
  "7d": 6,
  "14d": 13,
  "30d": 29,
  "90d": 89,
} as const;
export const GEO_DEFAULT_QUERY_DAYS = 30;
export const GEO_FILTER_TRIGGER_CLASS =
  "corner-squircle flex h-7 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-xs outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring";
/** Search vs memory gap that names a specific bottleneck. */
export const GEO_FAMILY_IMPROVE_SPLIT = 0.25;
/** Overall rate high enough that remaining misses are the whole job. */
export const GEO_FAMILY_IMPROVE_STRONG_RATE = 0.7;
export const GEO_FAMILY_BRANDS_LIMIT = 6;
export const GEO_SPARKLINE_MIN_POINTS = 2;
export const GEO_SPARKLINE_FLAT_THRESHOLD = 0.05;
export const GEO_SPARKLINE_TREND_CLASS: Record<"up" | "down" | "flat", string> =
  {
    up: "text-geo-up",
    down: "text-geo-down",
    flat: "text-muted-foreground",
  };
export const GEO_RATE_SPARKLINE_WIDTH = 56;
export const GEO_RATE_SPARKLINE_HEIGHT = 20;
export const GEO_RATE_SPARKLINE_PADDING = 2;
export const GEO_EMPTY_TIMESERIES: readonly GeoTimeseriesPoint[] = [];
export const GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES: readonly GeoCompetitorShareTimeseriesPoint[] =
  [];
export const GEO_EMPTY_PROMPT_RESULTS: readonly GeoPromptResultSummary[] = [];
export const GEO_EMPTY_COMPETITORS: readonly GeoCompetitor[] = [];
export const GEO_EMPTY_TRAFFIC_RESPONSE: AiTrafficResponse = {
  configured: false,
  totals: { crawler: 0, cited: 0, aiReferral: 0, conversions: null },
  previousConversions: null,
  sources: [],
  points: [],
};

export const GEO_MAX_ALIASES = 10;
export const GEO_MAX_COMPETITORS = 25;
export const GEO_MAX_CONVERSION_PATHS = 20;
export const GEO_CONVERSION_PATH_MAX_LENGTH = 200;
export const GEO_CONVERSION_PATHS_PLACEHOLDER = "/signup";
export const GEO_MAX_DOMAINS = 20;
export const GEO_PROJECT_DOMAINS_PLACEHOLDER = "docs.example.com";
export const GEO_COMPETITOR_MAX_SYNONYMS = 8;
export const GEO_SHORT_FIELD_MAX_LENGTH = 128;
export const GEO_DOMAIN_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
/** Debounce before persisting GEO settings. Short enough for toggles. */
export const GEO_SETTINGS_AUTO_SAVE_MS = 800;
export const GEO_MAX_LANGUAGES = 4;
export const GEO_LANGUAGE_MAX_PROMPTS = 5;
export const GEO_TRANSLATION_MAX_TOKENS = 2000;

export const COPY_FEEDBACK_MS = 2000;

export const GEO_TAB_VALUES = [
  "visibility",
  "brand-sentiment",
  "journeys",
] as const satisfies readonly GeoTab[];

export const GEO_TRAFFIC_REVEAL_MS = 150;

export const GEO_DEFAULT_TAB: GeoTab = "visibility";

export const GEO_CHAT_SKIN_SURFACE: Record<GeoChatSkin, string> = {
  claude: "bg-[#faf9f5] dark:bg-[#1c1b18]",
  chatgpt: "bg-background",
  gemini: "bg-white dark:bg-[#1f1f1f]",
  perplexity: "bg-white dark:bg-[#111]",
  opencode: "bg-[var(--opencode-tui-background,#fdfdfd)]",
  "claude-code": "bg-[#1a1a1a]",
  codex: "bg-[#1a1a1a]",
};

export const GEO_TAB_BREADCRUMB_LABELS = {
  visibility: "Visibility",
  "brand-sentiment": "Brand sentiment",
  journeys: "Journeys",
} satisfies Record<GeoTab, string>;

export const GEO_AVATAR_FALLBACK_BASE =
  "https://api.dicebear.com/9.x/glass/svg";
export const GEO_LOGO_SIZE_PX = 40;

export const GEO_COMPETITOR_DETAIL_DAYS = 30;
export const GEO_COMPETITOR_DETAIL_MIN_POINTS = 2;
export const GEO_COMPETITOR_DETAIL_SERIES_KEY = "mentions";
export const GEO_COMPETITOR_DETAIL_CHART_HEIGHT_CLASS = "h-56";

/** Dev-only: enables seeding GEO sample data from the settings page. */
export const GEO_SAMPLE_DATA_ENABLED = process.env.NODE_ENV === "development";

export const GEO_CHANGES_LIMIT = 40;
export const GEO_CHANGES_LABEL = "What changed";
export const GEO_CHANGES_ITEM_LABEL = "changes";
export const GEO_CHANGES_PAGE_KEY = "changes";
export const GEO_CHANGES_SKELETON_ROWS = 5;
/** One named brand fits the column; the rest collapse into a "+N" tooltip. */
export const GEO_CHANGES_COMPETITOR_STACK_LIMIT = 1;
export const GEO_CHANGES_POSITION_PREFIX = "#";
export const GEO_CHANGES_EMPTY_DETAIL = "-";
export const GEO_CHANGE_KIND_LABELS: Record<GeoChangeKind, string> = {
  gained_mention: "Gained mention",
  lost_mention: "Lost mention",
  position_improved: "Position up",
  position_dropped: "Position down",
  competitor_displaced: "Displaced by competitor",
  citation_added: "Citation gained",
  citation_removed: "Citation lost",
  competitor_cited: "Competitor cited",
  new_engine: "New engine",
};

export const GEO_CHANGE_KIND_ORDER: Record<GeoChangeKind, number> = {
  lost_mention: 0,
  competitor_displaced: 0,
  gained_mention: 1,
  position_improved: 2,
  position_dropped: 2,
  citation_added: 3,
  citation_removed: 3,
  competitor_cited: 3,
  new_engine: 4,
};

export const GEO_CHANGES_SUMMARY_GROUPS: readonly GeoChangesSummaryGroup[] = [
  { key: "mentions", up: "gained", down: "lost" },
  {
    key: "position",
    up: "positionImproved",
    down: "positionDropped",
  },
  {
    key: "citations",
    up: "citationsAdded",
    down: "citationsRemoved",
  },
];

export const GEO_EMPTY_CHANGES_SUMMARY: GeoChangesSummary = {
  gained: 0,
  lost: 0,
  positionImproved: 0,
  positionDropped: 0,
  citationsAdded: 0,
  citationsRemoved: 0,
};

/** Typed sentiment/position evaluation (Jev) that runs beside the judge LLM. */
export const GEO_MENTION_EVALUATION_FEATURE = "geo_mention_evaluation";
export const GEO_MENTION_EVALUATION_TIMEOUT_MS = 10_000;
/** Highest list rank the evaluation model can pick; longer lists fall back to the judge. */
export const GEO_MENTION_EVALUATION_MAX_POSITION = 10;
export const GEO_MENTION_EVALUATION_NO_POSITION = "none";
