import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@notra/ai/constants/languages";

import { GEO_MAX_LANGUAGES } from "../constants/geo";
import type {
  GeoLanguageSharePoint,
  LanguagePerformanceRow,
  LanguagePerformanceSuggestedRow,
  LanguagePerformanceTrackedRow,
} from "../types/geo";

const SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);

/**
 * The languages a project may track, in display order. Same list
 * `trackedGeoLanguages` filters against — callers that need to reject an
 * unsupported language before it reaches the store read it from here instead
 * of restating the list.
 */
export const SUPPORTED_GEO_LANGUAGES: readonly string[] = SUPPORTED_LANGUAGES;

export function isSupportedGeoLanguage(language: string): boolean {
  return SUPPORTED_LANGUAGE_SET.has(language);
}

const EMPTY_LANGUAGE_POINT = {
  checks: 0,
  mentions: 0,
  mentionRate: 0,
  citations: 0,
  visibility: 0,
  visibilityRate: 0,
  avgPosition: null,
} as const;

/** Languages a project scans, deduped and capped. Empty falls back to English. */
export function trackedGeoLanguages(languages: readonly string[]): string[] {
  const tracked: string[] = [];
  const seen = new Set<string>();
  for (const language of languages) {
    if (seen.has(language) || !SUPPORTED_LANGUAGE_SET.has(language)) {
      continue;
    }
    seen.add(language);
    tracked.push(language);
    if (tracked.length >= GEO_MAX_LANGUAGES) {
      break;
    }
  }
  return tracked.length > 0 ? tracked : [DEFAULT_LANGUAGE];
}

function canAddGeoLanguage(
  configuredLanguages: readonly string[],
  language: string
): boolean {
  if (!SUPPORTED_LANGUAGE_SET.has(language)) {
    return false;
  }
  const tracked = trackedGeoLanguages(configuredLanguages);
  return tracked.length < GEO_MAX_LANGUAGES && !tracked.includes(language);
}

export function withAddedGeoLanguage(
  configuredLanguages: readonly string[],
  language: string
): string[] | null {
  if (!canAddGeoLanguage(configuredLanguages, language)) {
    return null;
  }
  return [...trackedGeoLanguages(configuredLanguages), language];
}

/** Null when the language is not tracked or is the last one left. */
export function withRemovedGeoLanguage(
  configuredLanguages: readonly string[],
  language: string
): string[] | null {
  const tracked = trackedGeoLanguages(configuredLanguages);
  if (!tracked.includes(language) || tracked.length <= 1) {
    return null;
  }
  return tracked.filter((item) => item !== language);
}

function toTrackedRow(
  point: GeoLanguageSharePoint
): LanguagePerformanceTrackedRow {
  return { kind: "tracked", ...point };
}

function emptyTrackedRow(language: string): LanguagePerformanceTrackedRow {
  return { kind: "tracked", language, ...EMPTY_LANGUAGE_POINT };
}

function suggestedRow(language: string): LanguagePerformanceSuggestedRow {
  return { kind: "suggested", language };
}

export function buildLanguagePerformanceRows({
  points,
  configuredLanguages,
  slotCount,
}: {
  points: readonly GeoLanguageSharePoint[];
  configuredLanguages: readonly string[];
  slotCount: number;
}): LanguagePerformanceRow[] {
  const configured = trackedGeoLanguages(configuredLanguages);
  const tracked: LanguagePerformanceTrackedRow[] = points.map(toTrackedRow);
  const seen = new Set(tracked.map((row) => row.language));

  for (const language of configured) {
    if (seen.has(language)) {
      continue;
    }
    seen.add(language);
    tracked.push(emptyTrackedRow(language));
  }

  const remainingSlots = Math.max(0, slotCount - tracked.length);
  if (remainingSlots === 0) {
    return tracked;
  }

  const suggested: LanguagePerformanceSuggestedRow[] = [];
  for (const language of SUPPORTED_LANGUAGES) {
    if (seen.has(language)) {
      continue;
    }
    suggested.push(suggestedRow(language));
    if (suggested.length >= remainingSlots) {
      break;
    }
  }

  return [...tracked, ...suggested];
}
