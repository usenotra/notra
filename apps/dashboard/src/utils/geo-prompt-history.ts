import type {
  GeoPromptHistoryCheck,
  GeoPromptResultSummary,
} from "@notra/geo-core/types/geo";

import type { PromptHistoryChange, PromptHistoryEntry } from "@/types/geo";

export function promptHistoryForEngine(
  checks: readonly GeoPromptHistoryCheck[],
  engine: string
): GeoPromptHistoryCheck[] {
  return checks
    .filter((check) => check.engine === engine)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
}

export function promptHistoryForScanLanguage(
  checks: readonly GeoPromptHistoryCheck[],
  scanId: string | undefined,
  language: string
) {
  const scanChecks = checks.filter(
    (check) => !scanId || check.scanId === scanId
  );
  const languages = [...new Set(scanChecks.map((check) => check.language))];
  const selectedLanguage = languages.includes(language)
    ? language
    : languages[0];
  const visibleChecks = scanId
    ? scanChecks.filter((check) => check.language === selectedLanguage)
    : scanChecks;
  return { languages, selectedLanguage, visibleChecks };
}

function changesBetween(
  current: GeoPromptHistoryCheck,
  previous: GeoPromptHistoryCheck
): PromptHistoryChange[] {
  const changes: PromptHistoryChange[] = [];
  if (current.mentioned && !previous.mentioned) {
    changes.push({ kind: "gained", position: current.position });
  } else if (!current.mentioned && previous.mentioned) {
    changes.push({ kind: "lost" });
  } else if (
    current.mentioned &&
    previous.mentioned &&
    current.position !== previous.position
  ) {
    changes.push({
      kind: "position",
      from: previous.position,
      to: current.position,
    });
  }
  if (changes.length === 0) {
    changes.push({ kind: "none" });
  }
  return changes;
}

function newCompetitorsBetween(
  current: GeoPromptHistoryCheck,
  previous: GeoPromptHistoryCheck
): string[] {
  const known = new Set(previous.competitors);
  return current.competitors.filter((name) => !known.has(name));
}

export function promptHistoryChanges(
  checks: readonly GeoPromptHistoryCheck[]
): PromptHistoryEntry[] {
  const ordered = checks.toSorted((left, right) =>
    right.capturedAt.localeCompare(left.capturedAt)
  );
  return ordered.map((check, index) => {
    const previous = ordered[index + 1];
    return {
      check,
      changes: previous ? changesBetween(check, previous) : [{ kind: "first" }],
      newCompetitors: previous ? newCompetitorsBetween(check, previous) : [],
    };
  });
}

export function latestPromptResults(
  results: readonly GeoPromptResultSummary[],
  checks: readonly GeoPromptHistoryCheck[],
  promptId: string,
  prompt: string
): GeoPromptResultSummary[] {
  const latest = new Map(results.map((result) => [result.engine, result]));
  for (const check of checks) {
    const previous = latest.get(check.engine);
    if (!previous || check.capturedAt > previous.lastCheckedAt) {
      latest.set(check.engine, {
        checkId: check.id,
        promptId,
        prompt,
        engine: check.engine,
        mentioned: check.mentioned,
        ownedSourceCited: check.ownedSourceCited,
        position: check.position,
        sentiment: check.sentiment,
        competitors: check.competitors,
        lastCheckedAt: check.capturedAt,
      });
    }
  }
  return [...latest.values()];
}

export function promptSentimentKey(
  sentiment: string | null
): "positive" | "neutral" | "negative" | null {
  if (
    sentiment === "positive" ||
    sentiment === "neutral" ||
    sentiment === "negative"
  ) {
    return sentiment;
  }
  return null;
}

export function promptOutcomeKey(
  mentioned: boolean,
  ownedSourceCited = false
): "mentionedAndCited" | "mentioned" | "cited" | "notMentioned" {
  if (mentioned && ownedSourceCited) {
    return "mentionedAndCited";
  }
  if (mentioned) {
    return "mentioned";
  }
  return ownedSourceCited ? "cited" : "notMentioned";
}
