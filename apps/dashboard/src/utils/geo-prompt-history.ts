import {
  GEO_PROMPT_HISTORY_CHANGE_LABELS,
  GEO_PROMPT_HISTORY_LIST_LOCALE,
  GEO_PROMPT_RECEIPT_LABELS,
  GEO_SENTIMENT_LABELS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoPromptHistoryCheck,
  GeoPromptResult,
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

export function promptPositionLabel(position: number | null): string {
  return position === null
    ? GEO_PROMPT_RECEIPT_LABELS.notRanked
    : `#${position}`;
}

const nameListFormatter = new Intl.ListFormat(GEO_PROMPT_HISTORY_LIST_LOCALE, {
  style: "long",
  type: "conjunction",
});

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

export function promptHistoryChangeLabel(change: PromptHistoryChange): string {
  switch (change.kind) {
    case "gained":
      return change.position === null
        ? GEO_PROMPT_HISTORY_CHANGE_LABELS.gainedMention
        : `${GEO_PROMPT_HISTORY_CHANGE_LABELS.gainedMention} ${GEO_PROMPT_HISTORY_CHANGE_LABELS.gainedMentionAt} ${promptPositionLabel(change.position)}`;
    case "lost":
      return GEO_PROMPT_HISTORY_CHANGE_LABELS.lostMention;
    case "position":
      return `${GEO_PROMPT_HISTORY_CHANGE_LABELS.moved} ${promptPositionLabel(change.from)} → ${promptPositionLabel(change.to)}`;
    case "none":
      return GEO_PROMPT_HISTORY_CHANGE_LABELS.noChange;
    case "first":
      return GEO_PROMPT_HISTORY_CHANGE_LABELS.firstScan;
    default:
      return "";
  }
}

function changeSentence(change: PromptHistoryChange): string {
  const label = promptHistoryChangeLabel(change);
  if (change.kind === "first" || change.kind === "none") {
    return label;
  }
  return `${label}.`;
}

/** Plain-text form of a history row, for tooltips and receipts. */
export function promptHistoryChangeText(
  entry: Pick<PromptHistoryEntry, "changes" | "newCompetitors">
): string {
  const sentences = entry.changes.map(changeSentence);
  if (entry.newCompetitors.length > 0) {
    sentences.push(
      `${nameListFormatter.format(entry.newCompetitors)} ${GEO_PROMPT_HISTORY_CHANGE_LABELS.newlyRecommended}.`
    );
  }
  return sentences.join(" ");
}

/** Shapes a history check like a prompt result so the answer thread can render it. */
export function promptResultFromHistoryCheck(
  check: GeoPromptHistoryCheck,
  promptId: string,
  prompt: string
): GeoPromptResult {
  return {
    promptId,
    engine: check.engine,
    prompt,
    answer: check.answer,
    mentioned: check.mentioned,
    position: check.position,
    sentiment: check.sentiment,
    competitors: check.competitors,
    excerpt: check.excerpt,
    searchQueries: check.searchQueries,
    sources: check.sources,
    finishReason: null,
    promptTokens: null,
    outputTokens: null,
    reasoningTokens: null,
    truncated: null,
    lastCheckedAt: check.capturedAt,
  };
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
        position: check.position,
        sentiment: check.sentiment,
        competitors: check.competitors,
        lastCheckedAt: check.capturedAt,
      });
    }
  }
  return [...latest.values()];
}

export function promptSentimentLabel(sentiment: string | null): string {
  if (!sentiment) {
    return GEO_PROMPT_RECEIPT_LABELS.noSentiment;
  }
  return GEO_SENTIMENT_LABELS[sentiment] ?? sentiment;
}

export function promptOutcomeLabel(mentioned: boolean): string {
  return mentioned
    ? GEO_PROMPT_RECEIPT_LABELS.mentioned
    : GEO_PROMPT_RECEIPT_LABELS.notMentioned;
}
