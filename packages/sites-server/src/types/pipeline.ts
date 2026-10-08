import type { Option } from "effect";

import type { DeploymentOutcome } from "./deployments";

export interface BuildAndPublishOutcome {
  outcome: DeploymentOutcome | null;
  pendingTelemetryError: Option.Option<unknown>;
}
