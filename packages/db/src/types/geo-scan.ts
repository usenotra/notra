export const GEO_SCAN_EVENT_STEPS = [
  "prepare",
  "task_batch",
  "sequence_batch",
  "persona_batch",
  "finalize",
  "retry",
  "check",
] as const;

export type GeoScanEventStep = (typeof GEO_SCAN_EVENT_STEPS)[number];

export const GEO_SCAN_EVENT_STATUSES = ["success", "error"] as const;

export type GeoScanEventStatus = (typeof GEO_SCAN_EVENT_STATUSES)[number];

export interface GeoScanRoleUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalUsd: number;
}

export interface GeoScanUsageByRole {
  engine: GeoScanRoleUsage;
  judge: GeoScanRoleUsage;
}

export interface GeoScanEventWrite {
  id?: string;
  scanId: string;
  runId: string;
  step: GeoScanEventStep;
  status: GeoScanEventStatus;
  startedAt: Date;
  durationMs: number;
  engine?: string | null;
  taskKey?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  usage?: GeoScanUsageByRole | null;
}

export interface GeoScanPlanSnapshot {
  tasks?: GeoScanPlannedAnswer[];
  taskStates?: Record<string, "running" | "failed">;
  totalChecks: number;
  promptCount: number;
  sequenceCount: number;
  engines: string[];
  languages: string[];
}

export interface GeoScanPlanEngineSummary {
  readonly engine: string;
  readonly plannedChecks: number;
  readonly failedChecks: number;
}

export interface GeoScanPlanSummary {
  readonly plannedChecks: number;
  readonly hasTasks: boolean;
  readonly engines: string[];
  readonly taskCounts: GeoScanPlanEngineSummary[];
}

export interface GeoScanPlannedAnswer {
  personaId?: string;
  sequenceId?: string;
  turn?: number;
  key: string;
  promptId: string;
  prompt: string;
  engine: string;
  language: string;
}
