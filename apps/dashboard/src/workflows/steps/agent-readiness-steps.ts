import { executeAgentReadinessScan } from "@notra/geo-core/geo/agent-readiness";
import type {
  AgentReadinessWorkflowPayload,
  AgentReadinessWorkflowResult,
} from "@notra/geo-core/types/agent-readiness";
import { Effect } from "effect";

import { trackAgentReadinessScanResult } from "@/lib/analytics/geo-workflow-events";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function runAgentReadinessScanStep(
  payload: AgentReadinessWorkflowPayload
): Promise<AgentReadinessWorkflowResult> {
  "use step";
  const startedAt = Date.now();
  const result = await Effect.runPromise(
    executeAgentReadinessScan(payload).pipe(
      Effect.provide(geoCoreDashboardLayer)
    )
  );
  await trackAgentReadinessScanResult({
    payload,
    status: result.status,
    reason: result.status === "failed" ? result.reason : undefined,
    durationMs: Date.now() - startedAt,
  });
  return result;
}
