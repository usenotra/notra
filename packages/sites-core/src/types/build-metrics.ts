import type { SiteBuildResult } from "./build";

export type SiteBuildMetricPhase =
  | "repositoryAccess"
  | "sourceDownload"
  | "sandboxStartup"
  | "sourceUpload"
  | "execution"
  | "extract"
  | "compile"
  | "pack"
  | "resultRead"
  | "outputDownload"
  | "cleanup"
  | "publish";

export interface SiteBuildMetrics {
  version: 1;
  provider: "upstash";
  snapshotId: string | null;
  sandboxId: string | null;
  requestedSize: "medium";
  sourceArchiveBytes: number;
  outputArchiveBytes: number | null;
  totalDurationMs: number;
  phases: Partial<Record<SiteBuildMetricPhase, number>>;
  compilerAreas?: SiteBuildResult["areas"];
  sandboxCpuTimeMs?: number | null;
  sandboxMemoryPeakBytes?: number | null;
  exitCode?: number | null;
  cleanupSucceeded?: boolean;
}
