import type { TriggerCronConfig } from "../qstash/triggers";

export interface TriggerHashSourceConfig {
  eventTypes?: string[];
  includePreReleases?: boolean;
  ignoreCommitPatterns?: string[];
  cron?: TriggerCronConfig;
}

export interface TriggerHashTargets {
  repositoryIds: string[];
}

export interface TriggerConfigInput {
  sourceConfig: TriggerHashSourceConfig;
  targets: TriggerHashTargets;
}

export interface TriggerHashInput extends TriggerConfigInput {
  sourceType: string;
  outputType: string;
  lookbackWindow?: string;
  /** Per-schedule brief. Two otherwise identical schedules with different briefs are distinct. */
  instructions?: string;
}
