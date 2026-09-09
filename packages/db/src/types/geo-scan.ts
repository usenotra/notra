export interface GeoScanPlanSnapshot {
  tasks?: GeoScanPlannedAnswer[];
  taskStates?: Record<string, "running" | "failed">;
  totalChecks: number;
  promptCount: number;
  sequenceCount: number;
  engines: string[];
  languages: string[];
}

export interface GeoScanPlannedAnswer {
  key: string;
  promptId: string;
  prompt: string;
  engine: string;
  language: string;
}
