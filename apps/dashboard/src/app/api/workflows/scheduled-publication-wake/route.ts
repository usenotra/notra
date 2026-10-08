import { SCHEDULED_PUBLICATION_WAKE_ROUTE_PATH } from "@notra/ai/constants/scheduled-publications";
import { getBaseUrl } from "@notra/ai/qstash/triggers";
import { scheduledPublicationWakeSchema } from "@notra/schemas/dashboard/workflows/scheduled-publication-wake";
import { flattenError } from "zod";

import { SCHEDULED_PUBLICATION_WAKE_EARLY_TOLERANCE_MS } from "@/constants/content-calendar";
import { runScheduledPublicationSweep } from "@/lib/content/scheduled-publication-sweep";
import { verifyQstashSignature } from "@/lib/workflows/qstash-verify";

/**
 * QStash calls this when one post's schedule is due, and it claims whatever
 * of that post is due. A stale wake (rescheduled, canceled, already
 * published) claims nothing. A thrown error makes QStash redeliver; the cron
 * sweep covers a wake that never arrives.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyQstashSignature({
    request,
    rawBody,
    url: `${getBaseUrl()}${SCHEDULED_PUBLICATION_WAKE_ROUTE_PATH}`,
  });
  if (!verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const parsed = scheduledPublicationWakeSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "[ScheduledPublication] Invalid wake payload:",
      flattenError(parsed.error)
    );
    return new Response("Invalid payload", { status: 400 });
  }

  const nowMs = Date.now();
  const dueAtMs = new Date(parsed.data.dueAt).getTime();
  const landedEarly =
    dueAtMs > nowMs &&
    dueAtMs - nowMs <= SCHEDULED_PUBLICATION_WAKE_EARLY_TOLERANCE_MS;

  const result = await runScheduledPublicationSweep({
    postId: parsed.data.postId,
    dueBy: new Date(landedEarly ? dueAtMs : nowMs),
  });
  if (result.claimed > 0) {
    console.info("[ScheduledPublication] Wake", {
      postId: parsed.data.postId,
      ...result,
    });
  }
  return Response.json(result);
}
