import { redis } from "@notra/ai/utils/redis";

import type { WorkflowFailureAlertInput } from "@/types/workflow-failure-alert";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

export async function alertWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  const webhook = process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  if (!webhook) {
    return;
  }
  if (!redis) {
    throw new Error("Redis is required to deduplicate workflow alerts");
  }

  const key = `workflow:failure-alert:${input.runId}`;
  const claimed = await redis.set(key, "pending", { nx: true, ex: 30 });
  if (!claimed) {
    return;
  }
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: [
          ":warning: Workflow failed",
          `Workflow: ${input.workflow}`,
          `Run: ${input.runId}`,
          ...(input.organizationId
            ? [`Organization: ${input.organizationId}`]
            : []),
          ...(input.projectId ? [`Project: ${input.projectId}`] : []),
          ...(input.reason ? [`Reason: ${input.reason.slice(0, 500)}`] : []),
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Slack alert returned HTTP ${response.status}`);
    }
  } catch (error) {
    await redis.del(key);
    throw error;
  }
  await redis.set(key, "sent", { ex: 7 * 24 * 60 * 60 });
}

export async function notifyWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  try {
    await alertWorkflowFailure(input);
  } catch (error) {
    logWorkflowTelemetry({
      event: "workflow.alert.failed",
      outcome: "error",
      runId: input.runId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
