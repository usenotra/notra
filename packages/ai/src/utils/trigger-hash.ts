import crypto from "node:crypto";

import { normalizeCronConfig } from "../qstash/triggers";
import type {
  TriggerConfigInput,
  TriggerHashInput,
} from "../types/trigger-hash";

export function normalizeTriggerConfig({
  sourceConfig,
  targets,
}: TriggerConfigInput) {
  const eventTypes = sourceConfig.eventTypes
    ? [...sourceConfig.eventTypes].sort()
    : sourceConfig.eventTypes;
  const repositoryIds = [...targets.repositoryIds].sort();
  const cron = normalizeCronConfig(sourceConfig.cron);
  const ignoreCommitPatterns = normalizeIgnoreCommitPatterns(
    sourceConfig.ignoreCommitPatterns
  );

  return {
    sourceConfig: {
      ...sourceConfig,
      eventTypes,
      cron,
      // Undefined when empty so hashes of existing triggers stay unchanged
      // (JSON.stringify drops undefined values) and stored configs stay clean.
      ignoreCommitPatterns:
        ignoreCommitPatterns.length > 0 ? ignoreCommitPatterns : undefined,
    },
    targets: {
      repositoryIds,
    },
  };
}

function normalizeIgnoreCommitPatterns(patterns?: string[]) {
  if (!patterns) {
    return [];
  }
  // Mirror compileIgnoreCommitPatterns dispatch semantics (trim, drop
  // blank/dupes/over-long/invalid, cap count) so functionally-identical
  // pattern lists hash identically. Keeps sync with
  // MAX_IGNORE_COMMIT_PATTERNS / MAX_IGNORE_COMMIT_PATTERN_LENGTH in
  // @notra/schemas shared/automation (duplicated here to avoid a new
  // package dependency from @notra/ai).
  const MAX_PATTERNS = 10;
  const MAX_PATTERN_LENGTH = 120;
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    if (typeof pattern !== "string") {
      continue;
    }
    const trimmed = pattern.trim();
    if (!trimmed || trimmed.length > MAX_PATTERN_LENGTH || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    try {
      new RegExp(trimmed);
    } catch {
      continue;
    }
    valid.push(trimmed);
    if (valid.length >= MAX_PATTERNS) {
      break;
    }
  }
  return valid.sort();
}

export function hashTrigger({
  sourceType,
  sourceConfig,
  targets,
  outputType,
  lookbackWindow,
  instructions,
}: TriggerHashInput) {
  const normalized = normalizeTriggerConfig({ sourceConfig, targets });
  const trimmedInstructions = instructions?.trim();
  const payload = JSON.stringify({
    sourceType,
    sourceConfig: normalized.sourceConfig,
    targets: normalized.targets,
    outputType,
    lookbackWindow,
    // Omitted when empty so hashes of existing triggers stay unchanged.
    ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}
