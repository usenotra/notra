import { isDemoMode } from "@notra/utils/demo-mode";

import { agentReadinessNetworkDemo } from "./agent-readiness-demo";
import { agentReadinessNetworkLive } from "./agent-readiness-live";
import { geoModelDemo } from "./model-demo";
import { geoModelLive } from "./model-live";

/**
 * The model and agent-readiness layers every host provides. The public demo
 * swaps in local fakes here, so hosts compose the same layers either way.
 */
export const geoModelLayer = isDemoMode() ? geoModelDemo : geoModelLive;

export const agentReadinessNetworkLayer = isDemoMode()
  ? agentReadinessNetworkDemo
  : agentReadinessNetworkLive;
