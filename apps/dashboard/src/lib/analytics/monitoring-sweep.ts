import { Clock, Effect } from "effect";
import { getWorld } from "workflow/runtime";

import { WORKFLOW_MONITORING } from "@/constants/workflow-monitoring";
import { checkBackendHealth } from "@/lib/analytics/backend-health";
import { collectWorkflowMonitoring } from "@/lib/analytics/workflow-monitoring";
import { readMonitoringOperation } from "@/utils/monitoring-operation";

export const runMonitoringSweep = Effect.fn("monitoring.runSweep")(function* (
  sweepId: string
) {
  const startedAt = yield* Clock.currentTimeMillis;
  yield* checkBackendHealth();
  const remainingMs =
    WORKFLOW_MONITORING.sweepBudgetMs -
    ((yield* Clock.currentTimeMillis) - startedAt);
  const world = yield* readMonitoringOperation(
    {
      operation: "workflow.world",
      sweepId,
      timeoutMs: Math.min(WORKFLOW_MONITORING.operationTimeoutMs, remainingMs),
    },
    async () => getWorld()
  );
  return yield* collectWorkflowMonitoring(
    world,
    WORKFLOW_MONITORING.sweepBudgetMs -
      ((yield* Clock.currentTimeMillis) - startedAt),
    sweepId
  );
});
