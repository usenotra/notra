import type {
  GeoPresenceStatus,
  GeoPromptResultSummary,
  GeoPromptSummary,
} from "../types/geo";
import { engineFamilyLabel, engineFamilyOf } from "./geo-engine-family";

const GROUNDED_ENGINE_PATTERN =
  /(-direct)?-grounded$|^perplexity-sonar$|^google\/ai-overview$/;

export function isGroundedEngine(engine: string): boolean {
  return GROUNDED_ENGINE_PATTERN.test(engine);
}

function classifyPromptPresence(
  results: GeoPromptResultSummary[]
): GeoPresenceStatus | null {
  if (results.length === 0) {
    return null;
  }
  let mentionedRaw = false;
  let mentionedWeb = false;
  for (const result of results) {
    if (!result.mentioned) {
      continue;
    }
    if (isGroundedEngine(result.engine)) {
      mentionedWeb = true;
    } else {
      mentionedRaw = true;
    }
  }
  if (mentionedRaw) {
    return "training-data";
  }
  if (mentionedWeb) {
    return "retrieval-only";
  }
  return "invisible";
}

export function summarizePromptResults(
  results: GeoPromptResultSummary[]
): GeoPromptSummary[] {
  const groups = new Map<string, GeoPromptSummary>();
  for (const result of results) {
    const group = groups.get(result.promptId) ?? {
      promptId: result.promptId,
      prompt: result.prompt,
      mentioned: 0,
      total: 0,
      bestPosition: null,
      presence: null,
      results: [],
    };
    group.results.push(result);
    group.total += 1;
    if (result.mentioned) {
      group.mentioned += 1;
    }
    if (
      result.position !== null &&
      (group.bestPosition === null || result.position < group.bestPosition)
    ) {
      group.bestPosition = result.position;
    }
    groups.set(result.promptId, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      presence: classifyPromptPresence(group.results),
    }))
    .sort((a, b) => b.mentioned / b.total - a.mentioned / a.total);
}

export function sortWinningPromptSummaries(
  summaries: readonly GeoPromptSummary[]
): GeoPromptSummary[] {
  return summaries
    .filter((summary) => summary.mentioned > 0)
    .sort((a, b) => {
      const aRank = a.bestPosition ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.bestPosition ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return b.mentioned / b.total - a.mentioned / a.total;
    });
}

function uniqueEngineFamilies(
  summary: GeoPromptSummary,
  mentionedOnly: boolean
): string[] {
  const families = new Set<string>();
  for (const result of summary.results) {
    if (mentionedOnly && !result.mentioned) {
      continue;
    }
    families.add(engineFamilyOf(result.engine));
  }
  return [...families].sort((a, b) =>
    engineFamilyLabel(a).localeCompare(engineFamilyLabel(b))
  );
}

export function mentionedEngineFamilies(summary: GeoPromptSummary): string[] {
  return uniqueEngineFamilies(summary, true);
}

export function scannedEngineFamilies(summary: GeoPromptSummary): string[] {
  return uniqueEngineFamilies(summary, false);
}

export function unseenPromptSummaries(
  summaries: readonly GeoPromptSummary[]
): GeoPromptSummary[] {
  return summaries
    .filter((summary) => summary.mentioned === 0)
    .slice()
    .sort((left, right) => left.prompt.localeCompare(right.prompt));
}
