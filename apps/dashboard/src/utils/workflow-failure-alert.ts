import { redis } from "@notra/ai/utils/redis";

import type { WorkflowFailureAlertInput } from "@/types/workflow-failure-alert";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

const pendingKey = "workflow:failure-alerts:pending";

export async function enqueueWorkflowFailure(
  input: WorkflowFailureAlertInput
): Promise<void> {
  if (!process.env.GEO_SCAN_ALERT_WEBHOOK_URL || !redis) {
    return;
  }
  if (await redis.exists(`workflow:failure-alert:${input.runId}`)) {
    return;
  }
  await redis.set(`workflow:failure-alert:payload:${input.runId}`, input, {
    nx: true,
    ex: 30 * 24 * 60 * 60,
  });
  await redis.zadd(
    pendingKey,
    { nx: true },
    {
      score: Date.now(),
      member: input.runId,
    }
  );
}

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
  const leaseKey = `${key}:lease`;
  const claimed = await redis.set(key, "pending", {
    nx: true,
    ex: 7 * 24 * 60 * 60,
  });
  if (!claimed) {
    return;
  }
  try {
    await redis.set(leaseKey, "1", { ex: 30 });
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
    await redis.del(leaseKey);
    await redis.zadd(pendingKey, {
      score: Date.now() + 60_000,
      member: input.runId,
    });
    throw error;
  }
  // Keep the accepted-delivery claim even when queue cleanup fails.
  await redis.set(key, "sent", { xx: true, keepTtl: true });
  await redis.del(leaseKey);
  await redis.zrem(pendingKey, input.runId);
  await redis.del(`workflow:failure-alert:payload:${input.runId}`);
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
    count: 5,
  });
  await Promise.all(
    runIds.map(async (runId) => {
      const state = await client.get<string>(`workflow:failure-alert:${runId}`);
      if (state === "sent") {
        await client.zrem(pendingKey, runId);
        await client.del(`workflow:failure-alert:payload:${runId}`);
        return;
      }
      if (state === "pending") {
        const leaseKey = `workflow:failure-alert:${runId}:lease`;
        const [leased, ttl] = await Promise.all([
          client.exists(leaseKey),
          client.ttl(`workflow:failure-alert:${runId}`),
        ]);
        // The sender may have stopped before posting. Give it time to start
        // before clearing an unleased claim from a concurrent invocation.
        if (!leased && ttl < 7 * 24 * 60 * 60 - 30) {
          await client.del(`workflow:failure-alert:${runId}`);
        }
        await client.zadd(pendingKey, {
          score: Date.now() + 60_000,
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
