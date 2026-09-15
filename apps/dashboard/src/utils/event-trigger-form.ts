import {
  type AutomationOutputType,
  isUnsafeIgnoreCommitPattern,
  MAX_IGNORE_COMMIT_PATTERN_LENGTH,
  MAX_IGNORE_COMMIT_PATTERNS,
  SUPPORTED_AUTOMATION_OUTPUT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@notra/schemas/dashboard/integrations";

import type { EventTriggerFormValues } from "@/types/automation/event-trigger";
import type { Trigger } from "@/types/triggers/triggers";

export const DEFAULT_EVENT_TRIGGER_VALUES: EventTriggerFormValues = {
  eventType: "release",
  outputType: "changelog",
  repositoryIds: [],
  brandVoiceId: "",
  autoPublish: false,
  includePreReleases: true,
  ignoreCommitPatternsText: "",
};

export function isAutomationOutputType(
  outputType: string
): outputType is AutomationOutputType {
  return SUPPORTED_AUTOMATION_OUTPUT_TYPES.some((type) => type === outputType);
}

function normalizeBrandVoiceId(brandVoiceId?: string): string {
  return brandVoiceId && brandVoiceId !== "__default__" ? brandVoiceId : "";
}

export function getDefaultEventTriggerValues(
  trigger?: Trigger
): EventTriggerFormValues {
  if (!trigger) {
    return DEFAULT_EVENT_TRIGGER_VALUES;
  }

  const eventType = trigger.sourceConfig.eventTypes?.find((type) =>
    WEBHOOK_EVENT_TYPES.includes(type)
  );

  const outputType = SUPPORTED_AUTOMATION_OUTPUT_TYPES.find(
    (type) => type === trigger.outputType
  );

  return {
    eventType: eventType ?? DEFAULT_EVENT_TRIGGER_VALUES.eventType,
    outputType: outputType ?? DEFAULT_EVENT_TRIGGER_VALUES.outputType,
    repositoryIds: trigger.targets.repositoryIds,
    brandVoiceId: normalizeBrandVoiceId(trigger.outputConfig?.brandVoiceId),
    autoPublish: trigger.autoPublish,
    includePreReleases: trigger.sourceConfig.includePreReleases ?? true,
    ignoreCommitPatternsText: formatIgnoreCommitPatterns(
      trigger.sourceConfig.ignoreCommitPatterns
    ),
  };
}

export function formatIgnoreCommitPatterns(patterns?: string[]): string {
  return (patterns ?? []).join("\n");
}

export function parseIgnoreCommitPatternsText(value?: string): string[] {
  if (!value) {
    return [];
  }
  const patterns: string[] = [];
  const seen = new Set<string>();
  for (const line of value.split("\n")) {
    const trimmed = line.trim();
    // Lossy sanitizer for persistence: mirrors compileIgnoreCommitPatterns
    // (drop blank/dupes/over-long/invalid/unsafe) while the zod form schema
    // rejects those inputs with explicit errors before this runs.
    if (
      !trimmed ||
      trimmed.length > MAX_IGNORE_COMMIT_PATTERN_LENGTH ||
      seen.has(trimmed) ||
      isUnsafeIgnoreCommitPattern(trimmed)
    ) {
      continue;
    }
    try {
      new RegExp(trimmed);
    } catch {
      continue;
    }
    seen.add(trimmed);
    patterns.push(trimmed);
    if (patterns.length >= MAX_IGNORE_COMMIT_PATTERNS) {
      break;
    }
  }
  return patterns;
}
