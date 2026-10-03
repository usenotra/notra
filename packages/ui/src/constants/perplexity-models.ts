import type {
  PerplexityFocusId,
  PerplexityFocusOption,
  PerplexityModelId,
  PerplexityModelMenuItem,
  PerplexityModelOption,
} from "../types/perplexity";

export const PERPLEXITY_DEFAULT_MODEL: PerplexityModelId = "sonar";

export const PERPLEXITY_SONAR_MODEL: PerplexityModelOption = {
  id: "sonar",
  label: "Sonar",
  chip: "Sonar",
  description: "Fast answers with live search",
  group: "search",
};

export const PERPLEXITY_MODELS: readonly PerplexityModelOption[] = [
  PERPLEXITY_SONAR_MODEL,
  {
    id: "sonar-pro",
    label: "Sonar Pro",
    chip: "Pro",
    description: "Deeper search, more sources",
    group: "search",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    chip: "Reasoning",
    description: "Multi-step research",
    group: "reason",
  },
];

export const PERPLEXITY_MODEL_MENU: readonly PerplexityModelMenuItem[] = [
  { id: "sonar-2", label: "Sonar 2", provider: "perplexity", locked: true },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "openai",
    locked: true,
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "openai",
    badge: "max",
    locked: true,
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "google",
    badge: "new",
    locked: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    locked: true,
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "anthropic",
    badge: "max",
    locked: true,
  },
  { id: "kimi-k3", label: "Kimi K3", provider: "kimi", locked: true },
  { id: "glm-5.2", label: "GLM 5.2", provider: "zhipu", locked: true },
  {
    id: "grok-4.7",
    label: "Grok 4.7",
    provider: "xai",
    badge: "new",
    locked: true,
  },
  {
    id: "nemotron-3-super",
    label: "Nemotron 3 Super",
    provider: "nvidia",
    locked: true,
  },
];

export const PERPLEXITY_SEARCH_FOCUS: PerplexityFocusOption = {
  id: "search",
  label: "Search",
  description: "Quick answers from the live web",
};

export const PERPLEXITY_DEFAULT_FOCUS: PerplexityFocusId =
  PERPLEXITY_SEARCH_FOCUS.id;

export const PERPLEXITY_FOCUS_OPTIONS: readonly PerplexityFocusOption[] = [
  PERPLEXITY_SEARCH_FOCUS,
  {
    id: "research",
    label: "Research",
    description: "Longer reports with more sources",
  },
];
