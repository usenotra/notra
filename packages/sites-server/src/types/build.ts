import type {
  SiteBuildRequestInput,
  SiteBuildResult,
} from "@notra/sites-core/types/build";

export interface SandboxBuildResult {
  result: SiteBuildResult | null;
  crash: string | null;
  log: string;
  outputArchive: Uint8Array<ArrayBuffer> | null;
  toolchainVersion: string | null;
  durationMs: number;
}

export interface SandboxBuildParams {
  sourceArchive: Uint8Array<ArrayBuffer>;
  rootDirectory: string;
  target: SiteBuildRequestInput;
  onLog?: (log: string) => Promise<void>;
}

export interface SandboxUploadFile {
  path: string;
  data: Uint8Array<ArrayBuffer>;
}

export interface BuildLogFollower {
  stop: () => Promise<void>;
}
