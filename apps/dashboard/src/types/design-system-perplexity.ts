import type { PerplexityMessageRole } from "@notra/ui/components/ai-skins/perplexity/perplexity-message";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";

export interface PerplexityStoryCitation {
  id: string;
  label: string;
  domain: string;
  extra?: number;
}

export interface PerplexityStorySearch {
  title: string;
  queries: string[];
  sources: PerplexitySearchSource[];
  previewCount?: number;
  extraCount?: number;
}

export interface PerplexityStoryMessage {
  id: string;
  from: PerplexityMessageRole;
  text: string;
  search?: PerplexityStorySearch;
  citations?: readonly PerplexityStoryCitation[];
}
