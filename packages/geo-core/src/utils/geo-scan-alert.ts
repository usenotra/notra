import { redis } from "@notra/ai/utils/redis";

/** One Slack notification per schedule slot or stale run, even across retries. */
export async function alertMissedGeoScan(input: {
  organizationId: string;
  projectId: string;
  dueAt: Date;
  reason: string;
  lastScanAt?: Date | null;
  dedupeSeconds?: number;
}): Promise<void> {
  const webhook = process.env.GEO_SCAN_ALERT_WEBHOOK_URL;
  if (!webhook) {
    return;
  }
  if (!redis) {
    throw new Error("Redis is required to deduplicate GEO scan alerts");
  }

  const key = `geo:scan:missed-alert:${input.projectId}:${input.dueAt.toISOString()}`;
  // Overdue slots can remind daily; a terminal stale run alerts only once.
  // Overlapping monitoring invocations must not page twice at once.
  const claimed = await redis.set(key, "pending", {
    nx: true,
    ex: 30,
  });
  if (!claimed) {
    return;
  }
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: [
          ":warning: GEO scan needs attention",
          `Reason: ${input.reason}`,
          `Organization: ${input.organizationId}`,
          `Project: ${input.projectId}`,
          `Slot / run start: ${input.dueAt.toISOString()}`,
          ...(input.lastScanAt !== undefined
            ? [`Last attempt: ${input.lastScanAt?.toISOString() ?? "never"}`]
            : []),
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
  // Once Slack accepted the webhook, never release the claim on a Redis error:
  // that would send the same alert again on the next monitoring sweep.
  await redis.set(key, "sent", { ex: input.dedupeSeconds ?? 24 * 60 * 60 });
}
