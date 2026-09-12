import { GEO_PROMPT_INTENT_LABELS } from "@notra/geo-core/constants/geo";
import { GEO_PROMPT_FILTER_ALL } from "@notra/schemas/constants/dashboard/geo-prompts";
import { geoPromptSavedViewsSchema } from "@notra/schemas/dashboard/geo-prompt-views";

import { GEO_PROMPT_SOURCE_LABELS } from "@/constants/geo-prompts";
import type { GeoPromptSavedView, GeoPromptTableFilters } from "@/types/geo";

const GEO_PROMPT_VIEWS_EVENT = "notra:geo-prompt-views-change";
const EMPTY_VIEWS: GeoPromptSavedView[] = [];
const cache = new Map<
  string,
  { raw: string | null; views: GeoPromptSavedView[] }
>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseViews(raw: string | null): GeoPromptSavedView[] {
  if (raw === null) {
    return EMPTY_VIEWS;
  }
  try {
    const parsed = geoPromptSavedViewsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_VIEWS;
  } catch {
    return EMPTY_VIEWS;
  }
}

export function readGeoPromptViews(key: string): GeoPromptSavedView[] {
  const raw = readRaw(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) {
    return cached.views;
  }
  const views = parseViews(raw);
  cache.set(key, { raw, views });
  return views;
}

export function getGeoPromptViewsServerSnapshot(): GeoPromptSavedView[] {
  return EMPTY_VIEWS;
}

export function writeGeoPromptViews(
  key: string,
  views: GeoPromptSavedView[]
): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(views));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(GEO_PROMPT_VIEWS_EVENT));
}

export function subscribeGeoPromptViews(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(GEO_PROMPT_VIEWS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GEO_PROMPT_VIEWS_EVENT, onChange);
  };
}

export function promptFiltersActive(filters: GeoPromptTableFilters): boolean {
  return (
    filters.q.trim().length > 0 ||
    filters.intent !== GEO_PROMPT_FILTER_ALL ||
    filters.tag !== GEO_PROMPT_FILTER_ALL ||
    filters.source !== GEO_PROMPT_FILTER_ALL
  );
}

export function promptFiltersSummary(filters: GeoPromptTableFilters): string {
  const parts: string[] = [];
  if (filters.q.trim().length > 0) {
    parts.push(`"${filters.q.trim()}"`);
  }
  if (filters.intent !== GEO_PROMPT_FILTER_ALL) {
    parts.push(GEO_PROMPT_INTENT_LABELS[filters.intent]);
  }
  if (filters.tag !== GEO_PROMPT_FILTER_ALL) {
    parts.push(`#${filters.tag}`);
  }
  if (filters.source !== GEO_PROMPT_FILTER_ALL) {
    parts.push(GEO_PROMPT_SOURCE_LABELS[filters.source]);
  }
  return parts.length > 0 ? parts.join(" · ") : "All prompts";
}
