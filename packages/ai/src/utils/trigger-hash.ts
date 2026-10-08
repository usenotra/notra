import crypto from "node:crypto";

import { normalizeCronConfig } from "../qstash/triggers";
import { normalizeIgnoreCommitPatterns } from "../schemas/ignore-commit-patterns";
import type {
  ScheduleHashInput,
  TriggerConfigInput,
  TriggerHashInput,
} from "../types/trigger-hash";

export function scheduleDedupeHashes(input: ScheduleHashInput) {
  const canonical = hashTrigger({
    sourceType: input.sourceType,
    sourceConfig: input.sourceConfig,
    targets: input.targets,
    outputType: input.outputType,
    lookbackWindow: input.lookbackWindow,
    instructions: input.outputConfig?.instructions,
    brandVoiceId: input.outputConfig?.brandVoiceId,
  });
  const outputConfig = input.outputConfig;
  const legacy = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        sourceType: input.sourceType,
        sourceConfig: { cron: normalizeCronConfig(input.sourceConfig.cron) },
        targets: { repositoryIds: [...input.targets.repositoryIds].sort() },
        outputType: input.outputType,
        outputConfig:
          outputConfig == null
            ? null
            : {
                publishDestination: outputConfig.publishDestination,
                brandVoiceId: outputConfig.brandVoiceId?.trim(),
                instructions: outputConfig.instructions?.trim(),
              },
        lookbackWindow: input.lookbackWindow,
      })
    )
    .digest("hex");

  return [canonical, legacy] as const;
}

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
  brandVoiceId,
}: TriggerHashInput) {
  const normalized = normalizeTriggerConfig({ sourceConfig, targets });
  const trimmedInstructions = instructions?.trim();
  const trimmedBrandVoiceId = brandVoiceId?.trim();
  const payload = JSON.stringify({
    sourceType,
    sourceConfig: normalized.sourceConfig,
    targets: normalized.targets,
    outputType,
    lookbackWindow,
    ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}),
    ...(trimmedBrandVoiceId ? { brandVoiceId: trimmedBrandVoiceId } : {}),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}
