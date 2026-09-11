import { getBaseUrl } from "@notra/ai/qstash/triggers";
import { scheduleWorkflowPayloadSchema } from "@notra/schemas/dashboard/workflows";

import { verifyQstashSignature } from "@/lib/workflows/qstash-verify";
import { startScheduleRun } from "@/lib/workflows/start";

export async function POST(request: Request) {
  const messageId = request.headers.get("upstash-message-id");
  if (!messageId) {
    return new Response("Missing message id", { status: 400 });
  }

  const rawBody = await request.text();
  const verified = await verifyQstashSignature({
    request,
    rawBody,
    url: `${getBaseUrl()}/api/workflows/schedule`,
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

  const parsed = scheduleWorkflowPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "[Schedule] Invalid cron delivery payload:",
      parsed.error.flatten()
    );
    return new Response("Invalid payload", { status: 400 });
  }

  const { runId } = await startScheduleRun({
    ...parsed.data,
    executionId:
      parsed.data.executionId ??
      `schedule-${parsed.data.triggerId}-${messageId}`,
  });

  return Response.json({ runId }, { status: 202 });
}
