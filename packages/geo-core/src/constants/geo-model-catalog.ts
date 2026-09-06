import type { GeoModelCatalogEntry, GeoModelProvider } from "../types/geo";

/**
 * Providers surfaced in the GEO model picker, in display order. The live model
 * list comes from the Vercel AI Gateway feed (see `lib/geo/model-catalog.ts`);
 * this file only holds presentation config plus a seed snapshot used when the
 * feed is unreachable. A provider is dropped from the catalog when neither the
 * feed nor `GEO_MODEL_CATALOG_STATIC` yields a model for it.
 */
export const GEO_MODEL_PROVIDERS: readonly GeoModelProvider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    brand: "claude",
    featured: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    brand: "openai",
    featured: true,
  },
  {
    id: "google",
    label: "Google",
    brand: "gemini",
    featured: true,
  },
  {
    id: "moonshotai",
    label: "Moonshot AI",
    brand: "moonshot",
    featured: true,
  },
  {
    id: "meta",
    label: "Meta",
    brand: "meta",
    featured: false,
  },
  {
    id: "zai",
    label: "Z.AI",
    brand: "zai",
    featured: false,
  },
  {
    id: "spacexai",
    label: "SpaceXAI",
    brand: "grok",
    featured: false,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    brand: "deepseek",
    featured: false,
  },
  {
    id: "mistral",
    label: "Mistral AI",
    brand: "mistral",
    featured: false,
  },
  {
    id: "cursor",
    label: "Cursor",
    brand: "cursor",
    featured: false,
  },
  {
    id: "opencode",
    label: "OpenCode",
    brand: "opencode",
    featured: false,
  },
];

export const GEO_MODEL_CATALOG_SEED: readonly GeoModelCatalogEntry[] = [
  // Anthropic
  {
    id: "anthropic/claude-opus-5",
    provider: "anthropic",
    label: "Claude Opus 5",
    zdr: "all",
    released: "2026-07-24",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "anthropic/claude-sonnet-5",
    provider: "anthropic",
    label: "Claude Sonnet 5",
    zdr: "all",
    released: "2026-08-21",
    default: true,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "anthropic/claude-haiku-4.5",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    zdr: "all",
    released: "2025-10-15",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "anthropic/claude-fable-5",
    provider: "anthropic",
    label: "Claude Fable 5",
    zdr: "none",
    released: "2026-07-01",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // OpenAI
  {
    id: "openai/gpt-5.6-sol",
    provider: "openai",
    label: "GPT-5.6 Sol",
    zdr: "some",
    released: "2026-08-21",
    default: true,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "openai/gpt-5.6-terra",
    provider: "openai",
    label: "GPT-5.6 Terra",
    zdr: "some",
    released: "2026-08-21",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "openai/gpt-5.6-luna",
    provider: "openai",
    label: "GPT-5.6 Luna",
    zdr: "some",
    released: "2026-08-21",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "openai/gpt-5.4",
    provider: "openai",
    label: "GPT-5.4",
    zdr: "some",
    released: "2026-03-05",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "openai/gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    zdr: "some",
    released: "2026-04-24",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "openai/gpt-5.4-mini",
    provider: "openai",
    label: "GPT-5.4 mini",
    zdr: "some",
    released: "2026-03-17",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // Google
  {
    id: "google/gemini-3-flash",
    provider: "google",
    label: "Gemini 3 Flash",
    zdr: "some",
    released: "2025-12-17",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "google/gemini-3.1-pro-preview",
    provider: "google",
    label: "Gemini 3.1 Pro",
    zdr: "some",
    released: "2026-02-19",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "google/gemini-3.5-flash",
    provider: "google",
    label: "Gemini 3.5 Flash",
    zdr: "some",
    released: "2026-05-19",
    default: true,
    gateways: ["vercel", "openrouter"],
  },
  // Moonshot
  {
    id: "moonshotai/kimi-k3",
    provider: "moonshotai",
    label: "Kimi K3",
    zdr: "some",
    released: "2026-07-16",
    default: true,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "moonshotai/kimi-k2.6",
    provider: "moonshotai",
    label: "Kimi K2.6",
    zdr: "some",
    released: "2026-04-20",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // Meta
  {
    id: "meta/muse-spark-1.2",
    provider: "meta",
    label: "Muse Spark 1.2",
    zdr: "none",
    released: "2026-08-05",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "meta/muse-spark-1.1",
    provider: "meta",
    label: "Muse Spark 1.1",
    zdr: "none",
    released: "2026-07-09",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // Z.AI
  {
    id: "zai/glm-5.3",
    provider: "zai",
    label: "GLM 5.3",
    zdr: "some",
    released: "2026-08-21",
    default: true,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "zai/glm-5.2",
    provider: "zai",
    label: "GLM 5.2",
    zdr: "some",
    released: "2026-06-16",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "zai/glm-5.1",
    provider: "zai",
    label: "GLM 5.1",
    zdr: "some",
    released: "2026-04-07",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // xAI
  {
    id: "spacexai/grok-4.6",
    provider: "spacexai",
    label: "Grok 4.6",
    zdr: "none",
    released: "2026-08-12",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "spacexai/grok-4.5",
    provider: "spacexai",
    label: "Grok 4.5",
    zdr: "none",
    released: "2026-07-08",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // DeepSeek
  {
    id: "deepseek/deepseek-v4-pro",
    provider: "deepseek",
    label: "DeepSeek V4 Pro",
    zdr: "some",
    released: "2026-04-23",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  {
    id: "deepseek/deepseek-v4-flash",
    provider: "deepseek",
    label: "DeepSeek V4 Flash",
    zdr: "some",
    released: "2026-04-23",
    default: false,
    gateways: ["vercel", "openrouter"],
  },
  // Mistral
  {
    id: "mistral/mistral-medium-3.5",
    provider: "mistral",
    label: "Mistral Medium 3.5",
    zdr: "all",
    released: "2026-04-29",
    default: false,
    gateways: ["vercel"],
  },
  {
    id: "mistral/mistral-large-3",
    provider: "mistral",
    label: "Mistral Large 3",
    zdr: "all",
    released: "2025-12-02",
    default: false,
    gateways: ["vercel"],
  },
  {
    id: "mistral/mistral-small",
    provider: "mistral",
    label: "Mistral Small",
    zdr: "all",
    released: "2024-09-17",
    default: false,
    gateways: ["vercel"],
  },
];

/**
 * Models that do not run through the Notra AI router. They are appended to the
 * catalog instead of coming from the gateway feed. `zdr: "none"` because
 * neither direct runner exposes an enforceable ZDR route to GEO; under enforced
 * ZDR each engine therefore needs explicit approval before it is scanned.
 * Google AI Overview is fetched through SerpApi and is also non-ZDR.
 */
export const GEO_MODEL_CATALOG_STATIC: readonly GeoModelCatalogEntry[] = [
  {
    id: "cursor/composer-2.5",
    provider: "cursor",
    label: "Composer 2.5",
    zdr: "none",
    released: "2026-08-01",
    default: false,
    gateways: ["cursor"],
  },
  {
    id: "opencode/gpt-5.6-sol-medium",
    provider: "opencode",
    label: "GPT-5.6 Sol · medium",
    zdr: "none",
    released: "2026-08-21",
    default: false,
    gateways: ["box"],
  },
  {
    id: "google/ai-overview",
    provider: "google",
    label: "AI Overview",
    zdr: "none",
    released: "2026-09-05",
    default: false,
    gateways: ["serpapi"],
  },
];

/**
 * Environment variables that have to be set for a static engine to be
 * runnable. Static entries are hidden from the catalog while a key is missing.
 */
export const GEO_STATIC_ENGINE_ENV: Readonly<
  Record<string, readonly string[]>
> = {
  "cursor/composer-2.5": ["CURSOR_API_KEY"],
  "opencode/gpt-5.6-sol-medium": ["UPSTASH_BOX_API_KEY", "OPENROUTER_API_KEY"],
  "google/ai-overview": ["SERPAPI_API_KEY"],
};

/** Engines scanned when a project has not picked its own set. */
export const GEO_DEFAULT_ENGINE_IDS: readonly string[] =
  GEO_MODEL_CATALOG_SEED.filter((entry) => entry.default).map(
    (entry) => entry.id
  );

export const GEO_MODEL_FEED_URL = "https://ai-gateway.vercel.sh/v1/models";
export const GEO_MODEL_FEED_REVALIDATE_SECONDS = 3600;
/** Models shown per provider before "Show x other models". */
export const GEO_PICKER_VISIBLE_MODELS = 3;
/** Newest models kept per provider; defaults are always included. */
export const GEO_MODELS_PER_PROVIDER = 10;
export const GEO_MODEL_EXCLUDED_TAGS: ReadonlySet<string> = new Set([
  "image-generation",
  "video-generation",
]);
/** Host-speed variants and previews duplicate a model's answers. */
export const GEO_MODEL_EXCLUDED_ID_PATTERN = /(-fast|-beta|-contributor)$/;
/**
 * Coding, vision and edge-sized specialities. They are never used to answer
 * the prompts we scan, so they would only crowd out a provider's general
 * chat models in the per-provider slots.
 */
export const GEO_MODEL_EXCLUDED_SLUG_PATTERN =
  /(codestral|devstral|pixtral|ministral|mistral-nemo)/;
