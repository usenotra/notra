import {
  GEO_GAPS_ENGINE_FILTER_ALL,
  GEO_GAPS_METER_STEPS,
  GEO_SEARCH_GAP_ACTION_ORDER,
} from "@notra/geo-core/constants/geo";
import type {
  GeoAiSearchGapRow,
  GeoContentGapsResponse,
  GeoGapBriefRef,
  GeoGapWriteAction,
  GeoPromptGapRow,
  GeoSearchGapAction,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";

import type {
  GeoGapLift,
  GeoGapLiftTone,
  GeoGapsEmptyKind,
  GeoGapsMeterTone,
  GeoGapsTab,
} from "@/types/components/geo-gaps";

import { bestFuzzyScore, fuzzyMatches } from "./fuzzy";

export function withoutPromptGap(
  response: GeoContentGapsResponse,
  promptId: string
): GeoContentGapsResponse {
  return {
    ...response,
    promptGaps: response.promptGaps.filter((row) => row.id !== promptId),
  };
}

/** Re-insert one optimistically removed gap without touching other rows. */
export function withRestoredPromptGap(
  response: GeoContentGapsResponse,
  gap: GeoPromptGapRow
): GeoContentGapsResponse {
  if (response.promptGaps.some((row) => row.id === gap.id)) {
    return response;
  }
  return {
    ...response,
    promptGaps: [...response.promptGaps, gap].sort(
      (a, b) => b.opportunity - a.opportunity
    ),
  };
}

export function maxGapOpportunity(
  rows: readonly { opportunity: number }[]
): number {
  return Math.max(0, ...rows.map((row) => row.opportunity));
}

export function gapOpportunityLevel(
  opportunity: number,
  maxOpportunity: number
): number {
  return gapMeterLevel(maxOpportunity <= 0 ? 0 : opportunity / maxOpportunity);
}

export function isGeoGapsTab(value: unknown): value is GeoGapsTab {
  return value === "prompt" || value === "search" || value === "ai";
}

/** Map 0–1 intensity onto a 1–5 inspo-style meter (empty when intensity is 0). */
export function gapMeterLevel(
  intensity: number,
  steps = GEO_GAPS_METER_STEPS
): number {
  if (intensity <= 0 || steps <= 0) {
    return 0;
  }
  return Math.max(1, Math.min(steps, Math.round(intensity * steps)));
}

export function gapVisibleOnLabel(
  mentionedEngines: readonly string[],
  missingEngines: readonly string[]
): string {
  const visible = gapMissingEngineFamilies(mentionedEngines).length;
  const total = visible + gapMissingEngineFamilies(missingEngines).length;
  return `${visible}/${total}`;
}

export function gapMeterTone(level: number): GeoGapsMeterTone {
  if (level <= 0) {
    return "empty";
  }
  if (level <= 2) {
    return "low";
  }
  if (level === 3) {
    return "mid";
  }
  return "high";
}

/** Deduplicate scan engines to brand families (openai, claude, …). */
export function gapMissingEngineFamilies(engines: readonly string[]): string[] {
  const families: string[] = [];
  const seen = new Set<string>();
  for (const engine of engines) {
    const family = engineFamilyOf(engine);
    if (seen.has(family)) {
      continue;
    }
    seen.add(family);
    families.push(family);
  }
  return families;
}

export function gapWriteAction(
  brief: GeoGapBriefRef | null
): GeoGapWriteAction {
  if (!brief) {
    return "write";
  }
  if (brief.status === "completed" && brief.postId) {
    return "open";
  }
  if (brief.status === "writing" || brief.status === "approved") {
    return "writing";
  }
  if (brief.status === "draft" && brief.postId) {
    return "review";
  }
  if (brief.status === "failed" && brief.postId) {
    return "review";
  }
  return "write";
}

export function gapCanRescan(brief: GeoGapBriefRef | null): boolean {
  return brief?.status === "completed" && brief.postId !== null;
}

export function gapLift(row: GeoPromptGapRow): GeoGapLift | null {
  const baseline = row.brief?.baseline;
  if (!baseline) {
    return null;
  }
  const after = row.mentionedEngines.length;
  const total = after + row.engines.length;
  return {
    before: baseline.mentionedEngines,
    baselineTotal: baseline.totalEngines,
    after,
    total,
    delta: after - baseline.mentionedEngines,
  };
}

export function gapLiftTone(delta: number): GeoGapLiftTone {
  if (delta > 0) {
    return "up";
  }
  if (delta < 0) {
    return "down";
  }
  return "flat";
}

export function searchGapActionOrder(action: GeoSearchGapAction): number {
  return GEO_SEARCH_GAP_ACTION_ORDER[action];
}

export function existingPageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}

export function geoGapsEmptyKind({
  tab,
  hasScanData,
  isScanning,
  hasSourceRows = false,
  hasMatches = true,
}: {
  tab: GeoGapsTab;
  hasScanData: boolean;
  isScanning: boolean;
  hasSourceRows?: boolean;
  hasMatches?: boolean;
}): GeoGapsEmptyKind {
  if (hasSourceRows && !hasMatches) {
    return "no-matches";
  }
  if (tab === "search") {
    return "no-search-gaps";
  }
  if (isScanning && !hasScanData) {
    return "scanning";
  }
  if (!hasScanData) {
    return "no-scan";
  }
  return tab === "ai" ? "no-ai-search-gaps" : "no-prompt-gaps";
}

function gapSearchValues(row: {
  prompt: string;
  title: string | null;
  brief: GeoGapBriefRef | null;
  searchQueries?: string[];
}): string[] {
  return [
    row.prompt,
    row.title ?? "",
    row.brief?.workingTitle ?? "",
    ...(row.searchQueries ?? []),
  ];
}

function filterGapsByQuery<T>(
  rows: readonly T[],
  query: string,
  values: (row: T) => string[]
): T[] {
  const trimmed = query.trim();
  const matched = rows.filter((row) => fuzzyMatches(values(row), trimmed));
  if (trimmed.length === 0) {
    return matched;
  }
  return matched
    .map((row) => ({
      row,
      score: bestFuzzyScore(values(row), trimmed),
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.row);
}

export function filterPromptGaps(
  rows: readonly GeoPromptGapRow[],
  query: string,
  engineFamily: string
): GeoPromptGapRow[] {
  const byEngine =
    engineFamily === GEO_GAPS_ENGINE_FILTER_ALL
      ? rows
      : rows.filter((row) =>
          gapMissingEngineFamilies(row.engines).includes(engineFamily)
        );
  return filterGapsByQuery(byEngine, query, gapSearchValues);
}

export function filterSearchGaps(
  rows: readonly GeoSearchGapRow[],
  query: string
): GeoSearchGapRow[] {
  return filterGapsByQuery(rows, query, gapSearchValues);
}

export function filterAiSearchGaps(
  rows: readonly GeoAiSearchGapRow[],
  query: string
): GeoAiSearchGapRow[] {
  return filterGapsByQuery(rows, query, aiSearchGapSearchValues);
}

function aiSearchGapSearchValues(row: GeoAiSearchGapRow): string[] {
  return [
    row.query,
    ...row.variants,
    ...row.prompts,
    row.brief?.workingTitle ?? "",
  ];
}

export function uniqueGapEngineFamilies(
  rows: readonly GeoPromptGapRow[]
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const family of gapMissingEngineFamilies(row.engines)) {
      seen.add(family);
    }
  }
  return [...seen].sort((left, right) =>
    engineFamilyLabel(left).localeCompare(engineFamilyLabel(right))
  );
}
