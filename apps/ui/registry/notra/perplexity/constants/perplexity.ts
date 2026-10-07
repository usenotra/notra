import type {
  PerplexityRewriteMode,
  PerplexityFocusId,
  PerplexityFocusOption,
  PerplexityModel,
} from "../types/perplexity";

export const PERPLEXITY_THINKING_MS = 1500;
export const PERPLEXITY_THINKING_GAP_MS = 120;
export const PERPLEXITY_SEARCH_HEADER_MS = 480;
export const PERPLEXITY_SEARCH_QUERY_MS = 520;
export const PERPLEXITY_SEARCH_SOURCES_MS = 720;
export const PERPLEXITY_SEARCH_STAGGER_MS = 70;
export const PERPLEXITY_SEARCH_SETTLE_MS = 180;
export const PERPLEXITY_SEARCH_PREVIEW_COUNT = 4;

export const PERPLEXITY_SOURCES_PREVIEW_COUNT = 3;

export const PERPLEXITY_COPIED_RESET_MS = 1500;

export const PERPLEXITY_TOOLTIP_DELAY_MS = 200;
export const PERPLEXITY_CITATION_OPEN_DELAY_MS = 150;
export const PERPLEXITY_CITATION_CLOSE_DELAY_MS = 120;

export const PERPLEXITY_SEARCH_FOCUS: PerplexityFocusOption = {
  description: "Quick answers from the live web",
  id: "search",
  label: "Search",
};

export const PERPLEXITY_DEFAULT_FOCUS: PerplexityFocusId =
  PERPLEXITY_SEARCH_FOCUS.id;

export const PERPLEXITY_FOCUS_OPTIONS: readonly PerplexityFocusOption[] = [
  PERPLEXITY_SEARCH_FOCUS,
  {
    description: "Longer reports with more sources",
    id: "research",
    label: "Research",
  },
];

export const PERPLEXITY_MODELS: readonly PerplexityModel[] = [
  { id: "sonar-2", label: "Sonar 2", locked: true, provider: "perplexity" },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    locked: true,
    provider: "openai",
  },
  {
    badge: "max",
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    locked: true,
    provider: "openai",
  },
  {
    badge: "new",
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    locked: true,
    provider: "google",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    locked: true,
    provider: "anthropic",
  },
  {
    badge: "max",
    id: "claude-opus-5",
    label: "Claude Opus 5",
    locked: true,
    provider: "anthropic",
  },
  { id: "kimi-k3", label: "Kimi K3", locked: true, provider: "kimi" },
  { id: "glm-5.2", label: "GLM 5.2", locked: true, provider: "zhipu" },
  {
    badge: "new",
    id: "grok-4.7",
    label: "Grok 4.7",
    locked: true,
    provider: "xai",
  },
  {
    id: "nemotron-3-super",
    label: "Nemotron 3 Super",
    locked: true,
    provider: "nvidia",
  },
];

export const PERPLEXITY_REWRITE_MODES: readonly PerplexityRewriteMode[] = [
  { id: "search", label: "Search" },
  { id: "deep-research", label: "Deep research", locked: true },
  { id: "learn", label: "Learn step by step" },
];
