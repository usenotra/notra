import { GEO_PROMPT_FUNNEL_TOP_POSITION } from "@notra/geo-core/constants/geo";
import { trackedPromptScanId } from "@notra/geo-core/geo/prompts";
import type {
  GeoPresenceStatus,
  GeoPromptResultSummary,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import { engineFamilyOf } from "@notra/geo-core/utils/geo-engine-family";
import { summarizePromptResults } from "@notra/geo-core/utils/geo-presence";
import { geoPromptIntent } from "@notra/geo-core/utils/geo-prompt-intent";
import { GEO_PROMPT_FILTER_ALL } from "@notra/schemas/constants/dashboard/geo-prompts";

import type {
  EngineFamilyPromptHit,
  GeoPromptCoverage,
  GeoPromptTableFilters,
  GeoPromptTableRow,
} from "@/types/geo";
import { bestFuzzyScore, fuzzyMatches } from "@/utils/fuzzy";

function promptMentionSets(results: readonly GeoPromptResultSummary[]): {
  mentioned: Set<string>;
  topRanked: Set<string>;
} {
  const mentioned = new Set<string>();
  const topRanked = new Set<string>();
  for (const result of results) {
    if (!result.mentioned) {
      continue;
    }
    mentioned.add(result.promptId);
    if (
      result.position !== null &&
      result.position <= GEO_PROMPT_FUNNEL_TOP_POSITION
    ) {
      topRanked.add(result.promptId);
    }
  }
  return { mentioned, topRanked };
}

export function promptCoverage(
  promptCount: number,
  results: readonly GeoPromptResultSummary[]
): GeoPromptCoverage {
  const { mentioned } = promptMentionSets(results);
  if (promptCount <= 0) {
    return { mentioned: mentioned.size, total: 0, rate: null };
  }
  return {
    mentioned: mentioned.size,
    total: promptCount,
    rate: mentioned.size / promptCount,
  };
}

export function promptCoverageInsight(coverage: GeoPromptCoverage): string {
  if (coverage.rate === null) {
    return "add prompts to scan";
  }
  if (coverage.mentioned === 0) {
    return "no tracked prompts mentioned yet";
  }
  return `${coverage.mentioned} of ${coverage.total} tracked prompts`;
}

const PRESENCE_SORT_VALUE: Record<GeoPresenceStatus, number> = {
  "training-data": 3,
  "retrieval-only": 2,
  invisible: 1,
};

export function promptPresenceSortValue(
  status: GeoPresenceStatus | null
): number {
  if (!status) {
    return 0;
  }
  return PRESENCE_SORT_VALUE[status];
}

function matchesPromptFilters(
  prompt: GeoTrackedPrompt,
  intent: GeoPromptTableRow["intent"],
  filters: GeoPromptTableFilters
): boolean {
  if (
    filters.source !== GEO_PROMPT_FILTER_ALL &&
    prompt.source !== filters.source
  ) {
    return false;
  }
  if (filters.intent !== GEO_PROMPT_FILTER_ALL && intent !== filters.intent) {
    return false;
  }
  if (
    filters.tag !== GEO_PROMPT_FILTER_ALL &&
    !prompt.tags.includes(filters.tag)
  ) {
    return false;
  }
  return fuzzyMatches([prompt.prompt, ...prompt.tags], filters.q.trim());
}

export function buildPromptTableRows(
  prompts: readonly GeoTrackedPrompt[],
  results: readonly GeoPromptResultSummary[],
  filters: GeoPromptTableFilters
): GeoPromptTableRow[] {
  const summaries = new Map(
    summarizePromptResults([...results]).map((summary) => [
      summary.promptId,
      summary,
    ])
  );
  const query = filters.q.trim();
  const rows: GeoPromptTableRow[] = [];

  for (const prompt of prompts) {
    const intent = geoPromptIntent(prompt.prompt);
    if (!matchesPromptFilters(prompt, intent, filters)) {
      continue;
    }
    const summary = summaries.get(trackedPromptScanId(prompt));
    rows.push({
      id: prompt.id,
      prompt: prompt.prompt,
      enabled: prompt.enabled,
      source: prompt.source,
      tags: prompt.tags,
      intent,
      mentioned: summary?.mentioned ?? 0,
      total: summary?.total ?? 0,
      bestPosition: summary?.bestPosition ?? null,
      presence: summary?.presence ?? null,
      results: summary?.results ?? [],
    });
  }

  if (query.length === 0) {
    return rows;
  }

  return rows
    .map((row) => ({
      row,
      score: bestFuzzyScore([row.prompt, ...row.tags], query),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.row);
}

export function bestMentionedResult(
  results: readonly GeoPromptResultSummary[]
): GeoPromptResultSummary | null {
  let best: GeoPromptResultSummary | null = null;
  for (const result of results) {
    if (!result.mentioned) {
      continue;
    }
    if (
      best === null ||
      (result.position ?? Number.MAX_SAFE_INTEGER) <
        (best.position ?? Number.MAX_SAFE_INTEGER)
    ) {
      best = result;
    }
  }
  return best;
}

export function engineFamilyPromptHits(
  family: string,
  results: readonly GeoPromptResultSummary[]
): EngineFamilyPromptHit[] {
  const byPrompt = new Map<string, GeoPromptResultSummary[]>();
  for (const result of results) {
    if (engineFamilyOf(result.engine) !== family) {
      continue;
    }
    const group = byPrompt.get(result.promptId) ?? [];
    group.push(result);
    byPrompt.set(result.promptId, group);
  }

  const rows: EngineFamilyPromptHit[] = [];
  for (const [promptId, group] of byPrompt) {
    const mentioned = bestMentionedResult(group);
    const first = group[0];
    if (!first) {
      continue;
    }
    rows.push({
      promptId,
      prompt: first.prompt,
      mentioned: mentioned !== null,
      position: mentioned?.position ?? null,
    });
  }

  return rows.sort((left, right) => {
    if (left.mentioned !== right.mentioned) {
      return left.mentioned ? 1 : -1;
    }
    if (left.position === null && right.position === null) {
      return left.prompt.localeCompare(right.prompt);
    }
    if (left.position === null) {
      return 1;
    }
    if (right.position === null) {
      return -1;
    }
    return left.position - right.position;
  });
}

export function promptTableRowForId(
  promptId: string,
  results: readonly GeoPromptResultSummary[]
): GeoPromptTableRow | null {
  const group = results.filter((result) => result.promptId === promptId);
  const first = group[0];
  if (!first) {
    return null;
  }
  const mentioned = group.filter((result) => result.mentioned);
  const best = bestMentionedResult(group);
  return {
    id: promptId,
    prompt: first.prompt,
    enabled: true,
    source: "auto",
    tags: [],
    intent: geoPromptIntent(first.prompt),
    mentioned: mentioned.length,
    total: group.length,
    bestPosition: best?.position ?? null,
    presence: null,
    results: group,
  };
}
