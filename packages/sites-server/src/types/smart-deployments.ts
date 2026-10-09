import type { SmartDeploymentEvaluation } from "@notra/sites-core/types/smart-deployments";

export interface SmartDeploymentComparison {
  fingerprint: string | null;
  snapshotId: string | null;
  year: number;
  baseline: { deploymentId: string; generation: number } | null;
  evaluation: SmartDeploymentEvaluation | null;
}
