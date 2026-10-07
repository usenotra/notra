export interface PerplexitySearchLabels {
  showLess: string;
  more: (count: number) => string;
}

export type PerplexityModelId = "sonar" | "sonar-pro" | "reasoning";

export type PerplexityModelGroup = "search" | "reason";

export type PerplexityModelProvider =
  | "perplexity"
  | "openai"
  | "google"
  | "anthropic"
  | "kimi"
  | "zhipu"
  | "xai"
  | "nvidia";

export type PerplexityModelBadge = "max" | "new";

export interface PerplexityModelOption {
  id: PerplexityModelId;
  label: string;
  chip: string;
  description: string;
  group: PerplexityModelGroup;
}

export interface PerplexityModelMenuItem {
  id: string;
  label: string;
  provider: PerplexityModelProvider;
  badge?: PerplexityModelBadge;
  locked?: boolean;
}

export type PerplexityFocusId = "search" | "research";

export interface PerplexityFocusOption {
  id: PerplexityFocusId;
  label: string;
  description: string;
}

export interface PerplexitySearchSource {
  title: string;
  domain: string;
  verified?: boolean;
  url?: string;
}
