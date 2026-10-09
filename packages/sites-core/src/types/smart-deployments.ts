import type { SiteBuildTarget } from "./deployment";

export interface SiteGitTreeEntry {
  path?: string;
  sha?: string;
  type?: string;
  mode?: string;
  size?: number;
}

export interface SiteInputFingerprintParams {
  tree: readonly SiteGitTreeEntry[];
  truncated: boolean;
  rootDirectory: string;
  repositoryId: string;
  target: SiteBuildTarget;
  includeDrafts: boolean;
  snapshotId: string;
  year: number;
}

export interface SmartDeploymentEvaluation {
  comparedDeploymentId: string;
  inputsChanged: boolean;
  changeProbability: number | null;
  modelId: string | null;
}
