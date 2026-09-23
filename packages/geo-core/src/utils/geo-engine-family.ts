import {
  GEO_BRAND_LABELS,
  GEO_ENGINE_LABELS,
  GEO_LEGACY_GROUNDED_MODELS,
} from "../constants/geo";
import type { EngineIconKey } from "../types/geo";
import { resolveEngineIconKey } from "./geo-engine-icon";

export const GROUNDED_SUFFIX_PATTERN = /(-direct)?-grounded$/;

export function engineModelOf(engine: string): string {
  return (
    GEO_LEGACY_GROUNDED_MODELS[engine] ??
    engine.replace(GROUNDED_SUFFIX_PATTERN, "")
  );
}

export function engineFamilyOf(engine: string): string {
  return resolveEngineIconKey(engine) ?? engineModelOf(engine);
}

export function engineFamilyLabel(family: string): string {
  return (
    GEO_BRAND_LABELS[family] ??
    GEO_ENGINE_LABELS[family] ??
    GEO_ENGINE_LABELS[`${family}-grounded`] ??
    family
  );
}

/** Whole brand name only. Substring hits would draw Gemini for "Google". */
export function brandEngineIconKey(name: string): EngineIconKey | null {
  const key = resolveEngineIconKey(name);
  if (!key) {
    return null;
  }
  const normalized = name.trim().toLowerCase();
  const label = engineFamilyLabel(key).toLowerCase();
  return normalized === label || normalized === key ? key : null;
}
