import { redis } from "@notra/ai/utils/redis";

import { WORKFLOW_FAILURE_ALERT } from "@/constants/workflow-failure-alert";
import type { WorkflowFailureAlertInput } from "@/types/workflow-failure-alert";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

const pendingKey = "workflow:failure-alerts:pending";

export async function enqueueWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  if (!process.env.GEO_SCAN_ALERT_WEBHOOK_URL || !redis) {
    return;
  }
  if (await redis.exists(`workflow:failure-alert:${input.runId}:sent`)) {
    return;
  }
  await redis
    .multi()
    .set(`workflow:failure-alert:payload:${input.runId}`, input, {
      nx: true,
      ex: WORKFLOW_FAILURE_ALERT.payloadSeconds,
    })
    .zadd(pendingKey, { nx: true }, { score: Date.now(), member: input.runId })
    .exec();
}

async function alertWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  const webhook = process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  if (!webhook) {
    return;
  }
  if (!redis) {
    throw new Error("Redis is required to deduplicate workflow alerts");
  }

  const sentKey = `workflow:failure-alert:${input.runId}:sent`;
  // A short lock lets another sweep retry if this worker disappears mid-send.
  const claimed = await redis.set(
    `workflow:failure-alert:${input.runId}:lock`,
    "1",
    {
      nx: true,
      ex: WORKFLOW_FAILURE_ALERT.lockSeconds,
    }
  );
  if (!claimed) {
    return;
  }
  try {
    if (await redis.exists(sentKey)) {
      return;
    }
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
    await redis
      .multi()
      .set(sentKey, "1", { ex: WORKFLOW_FAILURE_ALERT.sentSeconds })
      .zrem(pendingKey, input.runId)
      .del(`workflow:failure-alert:payload:${input.runId}`)
      .exec();
  } catch (error) {
    await redis.zadd(pendingKey, {
      score: Date.now() + WORKFLOW_FAILURE_ALERT.retryMs,
      member: input.runId,
    });
    throw error;
  }
}

export async function notifyWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  try {
    await enqueueWorkflowFailure(input);
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

export async function retryWorkflowFailureAlerts(): Promise<void> {
  const client = redis;
  if (!process.env.GEO_SCAN_ALERT_WEBHOOK_URL || !client) {
    return;
  }
  const runIds = await client.zrange<string[]>(pendingKey, 0, Date.now(), {
    byScore: true,
    offset: 0,
    count: WORKFLOW_FAILURE_ALERT.batchSize,
  });
  await Promise.all(
    runIds.map(async (runId) => {
      if (await client.exists(`workflow:failure-alert:${runId}:sent`)) {
        await client.zrem(pendingKey, runId);
        await client.del(`workflow:failure-alert:payload:${runId}`);
        return;
      }
      if (await client.exists(`workflow:failure-alert:${runId}:lock`)) {
        await client.zadd(pendingKey, {
          score: Date.now() + WORKFLOW_FAILURE_ALERT.retryMs,
          member: runId,
        });
        return;
      }
      const input = await client.get<WorkflowFailureAlertInput>(
        `workflow:failure-alert:payload:${runId}`
      );
      if (input) {
        await notifyWorkflowFailure(input);
      } else {
        await client.zrem(pendingKey, runId);
      }
    })
  );
}
