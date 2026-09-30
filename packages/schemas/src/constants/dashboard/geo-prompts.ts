import { GEO_PROMPT_INTENTS } from "@notra/geo-core/constants/geo";

export const GEO_PROMPT_FILTER_ALL = "all";
export const GEO_PROMPT_INTENT_FILTER_VALUES = [
  GEO_PROMPT_FILTER_ALL,
  ...GEO_PROMPT_INTENTS,
] as const;
export const GEO_PROMPT_SOURCE_FILTER_VALUES = [
  GEO_PROMPT_FILTER_ALL,
  "custom",
  "auto",
] as const;
