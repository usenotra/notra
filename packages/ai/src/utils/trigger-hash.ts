import crypto from "node:crypto";

import { normalizeCronConfig } from "../qstash/triggers";
import { normalizeIgnoreCommitPatterns } from "../schemas/ignore-commit-patterns";
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
  ).sort();

  return {
    sourceConfig: {
      ...sourceConfig,
      eventTypes,
      cron,
      ignoreCommitPatterns:
        ignoreCommitPatterns.length > 0 ? ignoreCommitPatterns : undefined,
    },
    targets: {
      repositoryIds,
    },
  };
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
    ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}
