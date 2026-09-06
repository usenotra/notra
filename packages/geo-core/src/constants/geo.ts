import type {
  AiTrafficResponse,
  EngineIconKey,
  GeoChangeKind,
  GeoChangesSummary,
  GeoChangesSummaryGroup,
  GeoChatSkin,
  GeoCompetitor,
  GeoCompetitorKind,
  GeoCompetitorShareTimeseriesPoint,
  GeoGroundedProvider,
  GeoGroundedProviderConfig,
  GeoIngestFramework,
  GeoIngestPackageManager,
  GeoJourneyPathKind,
  GeoPromptIntent,
  GeoPromptIntentRule,
  GeoPromptResult,
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

/** Projects without the ZDR add-on cannot enforce ZDR; the server forces it off. */
export const GEO_ZDR_FEATURE_LABEL = "Zero data retention";

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
export const GEO_AI_OVERVIEW_ENGINE_ID = "google/ai-overview";
export const GEO_PROVIDER_TIMEOUT_MS = 120_000;
export const GEO_ANSWER_TIMEOUT_MS = 180_000;
export const GEO_CURSOR_TIMEOUT_MS = GEO_ANSWER_TIMEOUT_MS;
export const GEO_AI_OVERVIEW_TIMEOUT_MS = GEO_ANSWER_TIMEOUT_MS;
/** Databuddy flag that exposes the Cursor engine to an organization. */
export const GEO_CURSOR_FLAG_KEY = "geo-cursor";
/** Databuddy flag that exposes the OpenCode engine to an organization. */
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
/** Fallback before the gaps table measures remaining viewport height. */
export const GEO_GAPS_TABLE_HEIGHT = 420;
export const GEO_GAPS_METER_STEPS = 5;
export const GEO_GAPS_COMPETITOR_SIGNAL_CAP = 4;
export const GEO_GAPS_LOADING_STATUS =
  "Calculating gaps from the latest scan. This usually takes a few seconds.";
export const GEO_GAPS_COMPETITOR_DETAIL = {
  tracked: "Tracked competitor",
  discovered: "Discovered in answers, not tracked yet",
} as const;
export const GEO_GAPS_EMPTY_CELL = {
  competitors: "None mentioned",
  visibleOn: "Not visible on any engine",
  impressions: "No query data",
} as const;
export const GEO_GAPS_METER_TONE_CLASS = {
  empty: "bg-muted",
  low: "bg-geo-down",
  mid: "bg-geo-mid",
  high: "bg-geo-up",
} as const;
export const GEO_GAPS_LOGO_STACK_LIMIT = 4;
export const GEO_GAPS_WRITE_LABELS = {
  write: "Write from gap",
  review: "Review",
  writing: "Writing",
  open: "Open post",
} as const;
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
export const GEO_SEARCH_GAP_ACTION_LABELS: Record<GeoSearchGapAction, string> =
  {
    create: "Create",
    update: "Update",
    merge: "Merge",
    ignore: "Ignore",
  };
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
export const GEO_SEARCH_GAP_WRITE_LABELS = {
  create: "Write from gap",
  update: "Update page",
  merge: "Merge into page",
  ignore: "Write",
  dismiss: "Dismiss",
} as const;
export const GEO_SEARCH_GAP_DISMISSED_TOAST = "Search gap dismissed";
export const GEO_GAPS_EMPTY = {
  scanning: {
    title: "Scanning engines",
    description: "Gaps appear here once the scan finishes.",
  },
  "no-scan": {
    title: "No scan yet",
    description:
      "Run a scan to see which questions AI engines answer without mentioning you.",
    action: "Run scan",
  },
  "no-prompt-gaps": {
    title: "No prompt gaps",
    description: "Engines already mention you on the questions you track.",
  },
  "no-search-gaps": {
    title: "No search gaps",
    description:
      "Connect Search Console on Prompts to pull queries you don't cover yet.",
    action: "Open Prompts",
  },
  "no-matches": {
    title: "No matching gaps",
    description:
      "Nothing matches these filters. Try a different search or engine.",
  },
} as const;
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
export const GEO_WRITE_BRIEF_STATUS_LABELS = {
  draft: "Draft",
  approved: "Queued",
  writing: "Writing",
  completed: "Done",
  failed: "Failed",
} as const;

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

export const GEO_SEARCH_LABEL = "Search";
export const GEO_WITHOUT_SEARCH_LABEL = "Without search";

export const GEO_MAX_PROMPTS = 8;
export const GEO_MAX_SEQUENCES = 10;
export const GEO_COMPETITOR_SHARE_LIMIT = 50;
export const GEO_PROMPT_HISTORY_LIMIT = 120;
export const GEO_PROMPT_HISTORY_SKELETON_ROWS = 4;
export const GEO_PROMPT_HISTORY_PREVIEW_ROWS = 8;
export const GEO_PROMPT_HISTORY_EMPTY_POSITION = "\u2013";
export const GEO_PROMPT_HISTORY_EMPTY_COMPETITORS = "\u2013";
export const GEO_PROMPT_HISTORY_COLUMN_LABELS = {
  date: "Scan",
  outcome: "Outcome",
  position: "Position",
  changes: "What changed",
  newCompetitors: "Newly recommended",
} as const;
export const GEO_PROMPT_HISTORY_SHOW_ALL_LABEL = "Show all";
export const GEO_PROMPT_HISTORY_SHOW_LESS_LABEL = "Show latest";
export const GEO_PROMPT_RECEIPT_VIEW_LABELS = {
  analysis: "Analysis",
  raw: "Raw answer",
} as const;
export const GEO_PROMPT_RECEIPT_VIEW_GROUP_LABEL = "Receipt view";
export const GEO_PROMPT_ANSWER_COPY_LABEL = "Copy answer";
export const GEO_PROMPT_ANSWER_COPIED_MESSAGE = "Answer copied";
export const GEO_PROMPT_RECEIPT_LABELS = {
  mentioned: "Mentioned",
  notMentioned: "Not mentioned",
  position: "Position",
  notRanked: "Not ranked",
  sentiment: "Sentiment",
  noSentiment: "No sentiment",
  competitors: "Brands mentioned instead",
  noCompetitors: "None",
  searches: "Searches the engine ran",
  noSearches: "No web searches recorded",
  sources: "Sources cited",
  noSources: "No sources cited",
  history: "Scan history",
  singleScan: "Only one scan so far",
  noHistory: "No scans recorded yet",
  openSources: "Open sources",
} as const;
export const GEO_PROMPT_HISTORY_CHANGE_LABELS = {
  gainedMention: "Now mentioned",
  gainedMentionAt: "at",
  lostMention: "No longer mentioned",
  moved: "Moved",
  newlyRecommended: "newly recommended",
  noChange: "No change",
  firstScan: "First scan",
} as const;
export const GEO_PROMPT_HISTORY_LIST_LOCALE = "en";
export const GEO_PROMPT_HISTORY_ANSWER_LABELS = {
  viewAnswer: "View answer",
  scanFrom: "Scan from",
  backToLatest: "Back to latest scan",
} as const;
export const GEO_SHARE_OF_VOICE_TOP_BRANDS = 5;
export const GEO_SHARE_OF_VOICE_PAGE_TOP_BRANDS = 8;
export const GEO_VISIBILITY_TABLE_ROWS = GEO_SHARE_OF_VOICE_TOP_BRANDS + 1;
export const GEO_SEQUENCE_MAX_TURNS = 5;
export const GEO_GROUNDED_MAX_PROMPTS = 6;
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
export const GEO_SCAN_TASK_BATCH_SIZE = GEO_SCAN_CONCURRENCY;
export const GEO_SCAN_CLAIM_RENEW_AFTER_MS = 30 * 60 * 1000;
export const GEO_SCAN_SEQUENCE_BATCH_SIZE = 3;
export const GEO_SEQUENCE_PAIR_TIMEOUT_MS = 7 * 60 * 1000;
export const GEO_SCAN_DUE_LIMIT_PER_SWEEP = 25;
export const GEO_SCAN_POLL_INTERVAL_MS = 3000;
export const GEO_START_SCAN_MUTATION_KEY = "geo-start-scan";
export const GEO_RESCAN_LABEL = "Rescan";
export const GEO_RESCAN_TOOLTIP =
  "Re-run this prompt across engines to measure lift";
export const GEO_RESCAN_SOURCE_KINDS = ["gap", "prompt"] as const;
export const GEO_GAPS_WON_LABEL = "Won";
export const GEO_GAPS_WON_DETAIL =
  "Engines now mention you on most answers. Kept here so you can see the lift from the published article.";
export const GEO_GAPS_LIFT_BASELINE_LABEL = "Baseline";
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
export const GEO_PROMPT_INTENT_LABELS: Record<GeoPromptIntent, string> = {
  comparison: "Comparison",
  list: "List",
  how_to: "How to",
  question: "Question",
  other: "Other",
};
export const GEO_GAP_TITLE_MAX_LENGTH = 160;
export const GEO_DISCOVERY_MODEL = "anthropic/claude-sonnet-4.6";
export const GEO_DISCOVERY_MAX_TOKENS = 4000;
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
export const GEO_INGEST_TOKEN_GENERATION_CACHE_PREFIX = "geo:ingest-gen:v1";
export const GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS = 5 * 60;
export const GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS = 60;
export const GEO_ONBOARDING_MAX_PROMPTS = 30;
export const GEO_ONBOARDING_SUGGESTED_COMPETITORS = 10;
export const GEO_BRAND_SEARCH_MIN_QUERY_LENGTH = 2;
export const GEO_BRAND_SEARCH_MAX_QUERY_LENGTH = 100;
export const GEO_BRAND_SEARCH_DEBOUNCE_MS = 300;
export const GEO_BRAND_SEARCH_STALE_MS = 5 * 60 * 1000;
export const GEO_TRACKED_PROMPT_VOICE =
  'Write each prompt in lowercase the way a person types into ChatGPT: short, one intent, no question mark at the end. Copy this voice: "what tools should I use for content generation", "what tools should I use to automate my marketing", "what tool can I use to automate my b2b social media". Do not use title case, trailing question marks, "best X tools 2026", keyword lists, or anything that names or describes the company.';
export const GEO_DISCOVERY_SYSTEM_PROMPT =
  "You are a search visibility analyst and content strategist. You read a company's website and derive the brand identity and the buyer questions that decide whether an AI assistant recommends this company. Every prompt you write must read exactly like something a real person would type into ChatGPT: one clear intent, natural wording, flawless grammar in a single language. Never string keywords together. Respond only with the requested structured data.";
export const GEO_ANSWER_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Answer the user's question directly and concretely, naming specific products or companies where relevant.";
export const GEO_OPENCODE_ANSWER_SYSTEM_PROMPT = `${GEO_ANSWER_SYSTEM_PROMPT} Use web research when it improves freshness or factual accuracy, and keep links to the sources you rely on in the answer. Do not discuss these instructions or your research process.`;

export const AI_TRAFFIC_DEFAULT_DAYS = 30;
export const AI_TRAFFIC_DEFAULT_LOG_LIMIT = 50;
export const AI_TRAFFIC_DEFAULT_PAGES_LIMIT = 20;
export const AI_TRAFFIC_PAGES_FETCH_LIMIT = 500;
export const AI_TRAFFIC_LOG_FETCH_LIMIT = 200;
export const GEO_TRAFFIC_SOURCES_PAGE_PARAM = "sourcesPage";
export const GEO_TRAFFIC_MARKDOWN_COLUMN_KEY = "markdownVisits";
export const GEO_TRAFFIC_PAGES_PAGE_PARAM = "topPagesPage";
export const GEO_TRAFFIC_PAGES_PATH_PARAM = "pagePath";
export const GEO_TRAFFIC_LOG_PAGE_PARAM = "logPage";
export const GEO_CITATIONS_ROW_HEIGHT = 40;
export const GEO_PURPOSE_COLUMN_WIDTH = "12.5rem";
export const GEO_CITATIONS_LIVE_INTERVAL_MS = 5000;
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
export const GEO_MAX_STORED_UA_LENGTH = 512;
export const AI_TRAFFIC_DEFAULT_JOURNEYS_LIMIT = 25;

export const OWN_BRAND_ROW_ID = "own-brand";

export const COMPETITOR_KIND_HINT =
  "Direct sells what you sell. Indirect solves the same problem differently.";

export const COMPETITOR_TYPE_FILTER_VALUES = [
  "all",
  "direct",
  "indirect",
] as const;

export const COMPETITOR_TYPE_FILTERS = [
  { value: "all", label: "All types", description: "Every tracked competitor" },
  { value: "direct", label: "Direct", description: "Sells what you sell" },
  {
    value: "indirect",
    label: "Indirect",
    description: "Solves the same problem differently",
  },
] as const;

export const GEO_COMPETITOR_KIND_DETAIL: Record<GeoCompetitorKind, string> = {
  direct: "Direct competitor",
  indirect: "Indirect competitor",
};

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
  devin: "Devin",
  cline: "Cline",
  manus: "Manus",
  zai: "Z.ai",
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

export const GEO_VISITOR_TYPE_LABELS: Record<string, string> = {
  crawler: "AI crawler",
  ai_referral: "AI referral",
  unknown: "Unknown",
};

export const AI_TRAFFIC_PURPOSE_LABELS: Record<string, string> = {
  "training-crawler": "Model training",
  "search-index": "Search index",
  "assistant-browse": "Cited in answer",
  "assistant-referral": "Referral",
};

export const AI_TRAFFIC_PURPOSE_DESCRIPTIONS: Record<string, string> = {
  "training-crawler": "Collects pages for model training corpora",
  "search-index": "Builds the index an AI answer engine searches",
  "assistant-browse":
    "Fetched while an assistant was answering someone. A fetch is not proof of a citation",
  "assistant-referral":
    "A person clicked through to your site from an AI answer",
};

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
  exa: { key: "exa", label: "Exa", icon: "exasearchbot" },
  firecrawl: {
    key: "firecrawl",
    label: "Firecrawl",
    icon: "firecrawlagent",
  },
  parallel: { key: "parallel", label: "Parallel", icon: "shapbot" },
};

export const GEO_TRAFFIC_TREND_CRAWLER_KEY = "crawler";
export const GEO_TRAFFIC_TREND_REFERRAL_KEY = "aiReferral";
export const GEO_TRAFFIC_TREND_CRAWLER_LABEL = "Crawlers";
export const GEO_TRAFFIC_TREND_REFERRAL_LABEL = "Referrals";
export const GEO_TRAFFIC_CRAWLER_HINT =
  "Bots fetching your pages to train models or build a search index";
export const GEO_TRAFFIC_REFERRAL_HINT =
  "People who clicked through to your site from an AI answer";
export const GEO_STAT_DELTA_NEW = Number.POSITIVE_INFINITY;
export const GEO_STAT_DELTA_NEW_LABEL = "New";
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
export const GEO_TRAFFIC_CONVERSIONS_NOT_CONFIGURED_LABEL = "Not configured";
export const GEO_TRAFFIC_CONVERSIONS_SETUP_LABEL = "Set conversion paths";
export const GEO_TRAFFIC_CITATIONS_ONLY_LABEL = "Citations only";

export const GEO_TRAFFIC_LOG_VISITOR_OPTIONS: readonly GeoTrafficLogVisitorOption[] =
  [
    { value: "crawler", label: "AI crawler" },
    { value: "ai_referral", label: "AI referral" },
  ];

export const GEO_UNTRACKED_VISITOR_TYPES: readonly GeoVisitorType[] = ["human"];

export const GEO_TRAFFIC_LOG_PURPOSE_OPTIONS: readonly GeoTrafficLogPurposeOption[] =
  [
    { value: "training-crawler", label: "Model training" },
    { value: "search-index", label: "Search index" },
    { value: "assistant-browse", label: "Cited in answer" },
  ];

export const GEO_JOURNEY_KIND_LABELS: Record<string, string> = {
  tagged: "Tagged journey, followed a tagged link",
  fingerprint: "Fingerprinted journey, matched by heuristic",
};

export const GEO_JOURNEY_PATH_KINDS = [
  "home",
  "docs",
  "blog",
  "search",
  "page",
] as const;

export const GEO_JOURNEY_PATH_KIND_LABELS: Record<GeoJourneyPathKind, string> =
  {
    home: "Home",
    docs: "Docs",
    blog: "Posts",
    search: "Search",
    page: "Pages",
  };

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

export const GEO_JOURNEY_OVERVIEW_SOURCES = 5;
export const GEO_JOURNEY_OVERVIEW_PATHS = 5;
export const GEO_JOURNEY_TRAIL_TABLE_LIMIT = 4;
export const GEO_JOURNEY_TRAIL_DETAIL_LIMIT = 10;
export const GEO_JOURNEY_PATH_LABEL_MAX = 28;

export const AI_TRAFFIC_CONFIDENCE_LABELS: Record<string, string> = {
  verified: "Verified",
  reported: "Reported",
  heuristic: "Heuristic",
};

export const GEO_PRESENCE_LABELS: Record<string, string> = {
  "training-data": "In model",
  "retrieval-only": `${GEO_SEARCH_LABEL} only`,
  invisible: "Invisible",
};

export const GEO_SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const GEO_PROMPT_PREVIEW_ROW_HEIGHT = 72;
export const GEO_PROMPT_NO_MENTION = "No engine named you";

export const GEO_MENTION_TREND_BACKFILL_DAYS = 6;
export const GEO_MENTION_TREND_TOTAL_KEY = "total";
export const GEO_MENTION_TREND_TOTAL_LABEL = "All Models";
export const GEO_DEFAULT_RANGE: GeoRangePreset = "30d";
export const GEO_MENTION_TREND_LINE_KEY = "trend";
export const GEO_MENTION_TREND_LINE_LABEL = "Trend";
export const GEO_MENTION_TREND_AGENT_ICON_LIMIT = 4;
export const GEO_MENTION_TREND_ALL_PROVIDERS_LABEL = "All Models";
export const GEO_MENTION_ACTIVITY_LABEL = "Mention activity";
export const GEO_MENTION_SUMMARY_VISIBLE = 5;
export const GEO_MENTION_ROW_HEIGHT_REM = 2.75;
export const GEO_MENTION_HINT_HEIGHT_REM = 2;
export const GEO_MENTION_HINT_BLEED_REM = 1;
export const GEO_MENTION_UNTRACKED_HINT =
  "These mentions come from earlier scans. Add the model back in GEO settings to keep tracking it.";
export const GEO_PROVIDER_COLUMN_LABEL = "Provider";
export const GEO_PROVIDER_MENTIONS_COLUMN_LABEL = "Mentions · change";
export const GEO_BRAND_TRACKED_LABEL = "Tracked";
export const GEO_BRAND_DISCOVERED_LABEL = "Discovered";
export const GEO_BRAND_TRACK_ACTION = "Track";
export const GEO_SHARE_OF_VOICE_TRACKING_HINT =
  "Discovered brands come from scan answers. Tracked brands are called out in scans and available in the writer.";
export const GEO_LANGUAGE_PERFORMANCE_HINT =
  "The same prompts run in each tracked language. Add a language to track your mention rate there.";
export const GEO_ENGINE_PERFORMANCE_HINT =
  "How often each engine mentioned your brand in this range. Manage engines in GEO settings.";
export const GEO_PROMPT_AUTO_MANAGED_LABEL = "Managed automatically";
export const GEO_PROMPT_AUTO_MANAGED_HINT =
  "Generated from your site. Pause it to skip it in scans; it cannot be removed.";
export const GEO_PROMPT_TAGS_CUSTOM_ONLY_TOAST =
  "Tags apply to custom prompts. Auto-generated prompts were skipped.";
export const GEO_SCAN_PREFLIGHT_TITLE = "Run a scan now?";
export const GEO_SCAN_PREFLIGHT_BODY =
  "This run only — tracked engines stay as they are.";
export const GEO_SCAN_PREFLIGHT_CONFIRM = "Run scan";
export const GEO_SCAN_PREFLIGHT_CANCEL = "Cancel";
export const GEO_SCAN_PREFLIGHT_PENDING = "Starting…";
export const GEO_SCAN_PREFLIGHT_PROMPTS_LABEL = "Prompts";
export const GEO_SCAN_PREFLIGHT_ENGINES_LABEL = "Engines";
export const GEO_SCAN_PREFLIGHT_LANGUAGES_LABEL = "Languages";
export const GEO_SCAN_PREFLIGHT_LAST_SCAN_LABEL = "Last scan";
export const GEO_SCAN_PREFLIGHT_NEVER_SCANNED = "Not yet";
export const GEO_SCAN_PREFLIGHT_SELECT_ALL = "Select all";
export const GEO_SCAN_PREFLIGHT_NEED_ENGINE = "Pick at least one engine.";
export const GEO_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
] as const satisfies readonly {
  value: GeoRangePreset;
  label: string;
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
export const GEO_MENTION_RATE_LABEL = "Mention rate";
export const GEO_MENTIONS_LABEL = "Mentions";
export const GEO_AVG_POSITION_LABEL = "Avg position";
export const GEO_FAMILY_STAT_TREND_HINT = "vs first half of this range";
/** Search vs memory gap that names a specific bottleneck. */
export const GEO_FAMILY_IMPROVE_SPLIT = 0.25;
/** Overall rate high enough that remaining misses are the whole job. */
export const GEO_FAMILY_IMPROVE_STRONG_RATE = 0.7;
export const GEO_FAMILY_IMPROVE_CTA_GAPS = "Close these gaps";
export const GEO_FAMILY_ALL_MODES_LABEL = "All";
export const GEO_FAMILY_BRANDS_LABEL = "Brand ranking";
export const GEO_FAMILY_BRANDS_HINT =
  "How often each brand shows up in this engine's answers to your prompts";
export const GEO_FAMILY_BRANDS_LIMIT = 6;
export const GEO_FAMILY_OWN_BRAND_FALLBACK = "You";
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
export const GEO_EMPTY_PROMPT_RESULTS: readonly GeoPromptResult[] = [];
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
export const GEO_CONVERSION_PATHS_LABEL = "Conversion paths";
export const GEO_CONVERSION_PATHS_DESCRIPTION =
  "Paths that count as a conversion when an AI referral reaches them, for example /signup or /pricing. Prefix match; /pricing also counts /pricing/teams.";
export const GEO_CONVERSION_PATHS_PLACEHOLDER = "/signup";
export const GEO_COMPETITOR_MAX_SYNONYMS = 8;
export const GEO_SHORT_FIELD_MAX_LENGTH = 128;
export const GEO_DOMAIN_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
/** Debounce before persisting GEO settings. Short enough for toggles. */
export const GEO_SETTINGS_AUTO_SAVE_MS = 800;
export const GEO_MAX_LANGUAGES = 4;
export const GEO_LANGUAGE_MAX_PROMPTS = 5;
export const GEO_LANGUAGE_GROUNDED_MAX_PROMPTS = 3;
export const GEO_TRANSLATION_MAX_TOKENS = 2000;

export const COPY_FEEDBACK_MS = 2000;

export const GEO_TAB_VALUES = [
  "visibility",
  "prompts",
  "journeys",
] as const satisfies readonly GeoTab[];

export const GEO_TRAFFIC_REVEAL_MS = 150;

export const GEO_DEFAULT_TAB: GeoTab = "visibility";

export const GEO_CHAT_SKIN_SURFACE: Record<GeoChatSkin, string> = {
  claude: "bg-[#faf9f5] dark:bg-[#1c1b18]",
  chatgpt: "bg-background",
  gemini: "bg-white dark:bg-[#1f1f1f]",
  perplexity: "bg-white dark:bg-[#111]",
  opencode: "bg-[#fdfdfd]",
};

export const GEO_TAB_BREADCRUMB_LABELS: Record<string, string> = {
  visibility: "Visibility",
  prompts: "Prompts",
  journeys: "Journeys",
};

export const GEO_AVATAR_FALLBACK_BASE =
  "https://api.dicebear.com/9.x/glass/svg";
export const GEO_LOGO_SIZE_PX = 40;

export const GEO_COMPETITOR_DETAIL_DAYS = 30;
export const GEO_COMPETITOR_DETAIL_MIN_POINTS = 2;
export const GEO_COMPETITOR_DETAIL_SERIES_KEY = "mentions";
export const GEO_COMPETITOR_DETAIL_CHART_HEIGHT_CLASS = "h-56";

/** Dev-only: enables seeding GEO sample data from the settings page. */
export const GEO_SAMPLE_DATA_ENABLED = process.env.NODE_ENV === "development";

export const GEO_UPGRADE_TITLE = "Upgrade required";
export const GEO_UPGRADE_DESCRIPTION =
  "AI visibility tracking is included in Starter, Growth, and Scale. Pick a plan to unlock GEO for this workspace.";
export const GEO_UPGRADE_TOOLTIP = "Upgrade your plan to unlock GEO";
export const GEO_LOCKED_TITLE = "GEO is locked on your current plan";

export const GEO_CHANGES_LIMIT = 40;
export const GEO_CHANGES_LABEL = "What changed";
export const GEO_CHANGES_SUBLINE_PREFIX = "Latest scan vs previous scan";
export const GEO_CHANGES_SCANNING_SUBLINE = "Scan in progress";
export const GEO_CHANGES_EMPTY_NEEDS_SCANS =
  "Run two scans to see what changed";
export const GEO_CHANGES_EMPTY_NO_CHANGES =
  "No changes between the last two scans";
export const GEO_CHANGES_ITEM_LABEL = "changes";
export const GEO_CHANGES_PAGE_KEY = "changes";
export const GEO_CHANGES_SKELETON_ROWS = 5;
export const GEO_CHANGES_COLUMN_LABELS = {
  change: "Change",
  engine: "Engine",
  prompt: "Prompt",
  position: "Position",
  detail: "Recommended instead",
} as const;
export const GEO_CHANGES_STATE_NEW = "New";
export const GEO_CHANGES_STATE_NOT_MENTIONED = "Not mentioned";
export const GEO_CHANGES_STATE_MENTIONED = "Mentioned";
export const GEO_CHANGES_POSITION_PREFIX = "#";
export const GEO_CHANGES_EMPTY_DETAIL = "-";
export const GEO_CHANGES_COMPETITORS_PREFIX = "Now recommended";
export const GEO_CHANGES_CITATIONS_ADDED_PREFIX = "New citations";
export const GEO_CHANGES_CITATIONS_REMOVED_PREFIX = "Citations dropped";

export const GEO_CHANGE_KIND_LABELS: Record<GeoChangeKind, string> = {
  gained_mention: "Gained mention",
  lost_mention: "Lost mention",
  position_improved: "Position up",
  position_dropped: "Position down",
  competitor_displaced: "Displaced by competitor",
  citation_added: "Citation added",
  citation_removed: "Citation removed",
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
  new_engine: 4,
};

export const GEO_CHANGES_SUMMARY_LABELS: Record<
  keyof GeoChangesSummary,
  string
> = {
  gained: "Gained",
  lost: "Lost",
  positionImproved: "Position up",
  positionDropped: "Position down",
  citationsAdded: "Citations added",
  citationsRemoved: "Citations removed",
};

export const GEO_CHANGES_SUMMARY_HINTS: Record<
  keyof GeoChangesSummary,
  string
> = {
  gained: "Prompts where an engine started mentioning your brand",
  lost: "Prompts where an engine stopped mentioning your brand",
  positionImproved: "Prompts where your brand moved up in the answer",
  positionDropped: "Prompts where your brand moved down in the answer",
  citationsAdded: "Prompts where an engine started citing your pages",
  citationsRemoved: "Prompts where an engine stopped citing your pages",
};

export const GEO_CHANGES_SUMMARY_GROUPS: readonly GeoChangesSummaryGroup[] = [
  { key: "mentions", label: "Mentions", up: "gained", down: "lost" },
  {
    key: "position",
    label: "Position",
    up: "positionImproved",
    down: "positionDropped",
  },
  {
    key: "citations",
    label: "Citations",
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
