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
