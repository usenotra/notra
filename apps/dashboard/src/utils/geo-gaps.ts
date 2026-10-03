import {
  GEO_GAPS_ENGINE_FILTER_ALL,
  GEO_GAPS_METER_STEPS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoAiSearchGapRow,
  GeoContentGapsResponse,
  GeoGapBriefRef,
  GeoGapWriteAction,
  GeoPromptGapRow,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { aiSearchGroupKey } from "@notra/geo-core/utils/geo-gaps";

import type {
  GeoGapLift,
  GeoGapLiftTone,
  GeoGapsEmptyKind,
  GeoGapsMeterTone,
  GeoGapsTab,
  GeoUnifiedSearchGap,
} from "@/types/components/geo-gaps";

import { bestFuzzyScore, fuzzyMatches } from "./fuzzy";

export function unifySearchGaps(
  searchGaps: readonly GeoSearchGapRow[],
  aiSearchGaps: readonly GeoAiSearchGapRow[]
): GeoUnifiedSearchGap[] {
  const remainingAi = [...aiSearchGaps];
  const consoleRows: GeoUnifiedSearchGap[] = searchGaps.map((row) => {
    const queries = new Set(
      [row.prompt, ...row.queries.map((keyword) => keyword.query)]
        .map(aiSearchGroupKey)
        .filter(Boolean)
    );
    const index = remainingAi.findIndex((candidate) =>
      [candidate.query, ...candidate.variants].some((query) => {
        const key = aiSearchGroupKey(query);
        return key.length > 0 && queries.has(key);
      })
    );
    const [ai = null] = index < 0 ? [] : remainingAi.splice(index, 1);
    return { kind: "console", row, ai };
  });
  return [
    ...consoleRows,
    ...remainingAi.map((row) => ({ kind: "ai" as const, row })),
  ];
}

export function primarySearchQuery(row: GeoSearchGapRow): string {
  return (
    row.queries.reduce(
      (best, keyword) =>
        keyword.impressions > (best?.impressions ?? -1) ? keyword : best,
      row.queries[0]
    )?.query ?? row.prompt
  );
}

export function searchGapDemandRank(gap: GeoUnifiedSearchGap): number {
  const impressions = gap.kind === "console" ? (gap.row.impressions ?? 0) : 0;
  const searches =
    gap.kind === "console" ? (gap.ai?.searches ?? 0) : gap.row.searches;
  // ponytail: simple ranking heuristic; calibrate weights once demand-to-draft data exists.
  return Math.log1p(impressions) + 2 * Math.log1p(searches);
}

/** AI draft to surface next to Console actions when only the AI match has a brief. */
export function searchGapAiDraft(
  gap: GeoUnifiedSearchGap
): GeoAiSearchGapRow | null {
  if (gap.kind !== "console" || gap.row.brief || !gap.ai?.brief) {
    return null;
  }
  return gap.ai;
}

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
  return value === "prompt" || value === "search";
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
  snapshotReady = true,
  isScanning,
  hasSourceRows = false,
  hasMatches = true,
}: {
  tab: GeoGapsTab;
  hasScanData: boolean;
  snapshotReady?: boolean;
  isScanning: boolean;
  hasSourceRows?: boolean;
  hasMatches?: boolean;
}): GeoGapsEmptyKind {
  if (!snapshotReady) {
    return "preparing";
  }
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
  return "no-prompt-gaps";
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

function aiSearchGapSearchValues(row: GeoAiSearchGapRow): string[] {
  return [
    row.query,
    ...row.variants,
    ...row.prompts,
    row.brief?.workingTitle ?? "",
  ];
}

export function filterUnifiedSearchGaps(
  rows: readonly GeoUnifiedSearchGap[],
  query: string
): GeoUnifiedSearchGap[] {
  return filterGapsByQuery(rows, query, (gap) =>
    gap.kind === "console"
      ? [
          ...gapSearchValues(gap.row),
          ...(gap.ai ? aiSearchGapSearchValues(gap.ai) : []),
        ]
      : aiSearchGapSearchValues(gap.row)
  );
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
