export const GEO_SEARCH_LABEL = "Search";

export const GEO_PRESENCE_LABELS: Record<string, string> = {
  "training-data": "In knowledge",
  "retrieval-only": `${GEO_SEARCH_LABEL} only`,
  invisible: "Not mentioned",
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
  "assistant-referral": "A person clicked through to your site from an AI answer",
};

export const GEO_GAPS_LOGO_STACK_LIMIT = 4;

export const GEO_GAPS_METER_STEPS = 5;

export const MODELS_DEV_LOGO_BASE = "https://models.dev/logos";

export const MODELS_DEV_LOGO_ALIASES: Record<string, string> = {
  amazon: "amazon-bedrock",
  "google-ai-studio": "google",
  "google-vertex": "google",
  "google-vertex-anthropic": "anthropic",
  "meta-llama": "meta",
  mistralai: "mistral",
  moonshot: "moonshotai",
  qwen: "alibaba",
  "x-ai": "xai",
  "z-ai": "zai",
  zhipuai: "zai",
};

export const GEO_LOGO_SIZE_PX = 40;
