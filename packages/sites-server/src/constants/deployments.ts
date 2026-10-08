import type { DeploymentOutcome } from "../types/deployments";

export const CANCELED_OUTCOME: DeploymentOutcome = {
  kind: "skipped",
  reason: "The preview was closed while it was building.",
};

export const ROLLBACK_HISTORY = 10;
export const DEPLOYMENT_SETTLE_MS = 24 * 60 * 60 * 1000;
