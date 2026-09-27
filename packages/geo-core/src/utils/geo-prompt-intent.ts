import { GEO_PROMPT_INTENT_RULES, GEO_PROMPT_INTENTS } from "../constants/geo";
import type { GeoPromptIntent } from "../types/geo";

export function geoPromptIntent(text: string): GeoPromptIntent {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return "other";
  }
  for (const rule of GEO_PROMPT_INTENT_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.intent;
    }
  }
  return "other";
}

export function isGeoPromptIntent(value: string): value is GeoPromptIntent {
  return GEO_PROMPT_INTENTS.some((intent) => intent === value);
}
