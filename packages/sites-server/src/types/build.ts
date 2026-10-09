import type {
  SiteBuildRequestInput,
  SiteBuildResult,
} from "@notra/sites-core/types/build";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import type { Effect } from "effect";

export interface SandboxBuildResult {
  result: SiteBuildResult | null;
  crash: string | null;
  log: string;
  outputArchive: Uint8Array<ArrayBuffer> | null;
  toolchainVersion: string | null;
  durationMs: number;
  metrics?: SiteBuildMetrics;
}

export interface SandboxBuildParams {
  sourceArchive: Uint8Array<ArrayBuffer>;
  rootDirectory: string;
  snapshotId?: string;
  target: SiteBuildRequestInput;
  onLog?: (log: string) => Promise<void>;
  onComplete?: (build: SandboxBuildResult) => Promise<void>;
}

export interface SandboxUploadFile {
  path: string;
  data: Uint8Array<ArrayBuffer>;
}

export interface SandboxBuildEffectParams extends Omit<
  SandboxBuildParams,
  "onLog" | "onComplete"
> {
  onLog?: (log: string) => Effect.Effect<void, unknown>;
  onComplete?: (build: SandboxBuildResult) => Effect.Effect<void, unknown>;
}
