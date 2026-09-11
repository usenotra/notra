import { getAppUrl } from "@notra/ai/qstash/triggers";
import { irisWakeDeliverySchema } from "@notra/schemas/dashboard/workflows/iris";
import { flattenError } from "zod";

import { IRIS_WAKE_ROUTE_PATH } from "@/constants/iris";
import { buildIrisWakeExecutionId } from "@/lib/iris/wake-schedule";
import { verifyQstashSignature } from "@/lib/workflows/qstash-verify";
import { startIrisRun } from "@/lib/workflows/start";

export async function POST(request: Request) {
  const messageId = request.headers.get("upstash-message-id");
  if (!messageId) {
    return new Response("Missing message id", { status: 400 });
  }

  const rawBody = await request.text();
  const verified = await verifyQstashSignature({
    request,
    rawBody,
    url: `${getAppUrl()}${IRIS_WAKE_ROUTE_PATH}`,
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

  const parsed = irisWakeDeliverySchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "[Iris] Invalid wake delivery payload:",
      flattenError(parsed.error)
    );
    return new Response("Invalid payload", { status: 400 });
  }

  const { runId } = await startIrisRun({
    organizationId: parsed.data.organizationId,
    trigger: parsed.data.trigger,
    executionId: buildIrisWakeExecutionId(
      parsed.data.organizationId,
      messageId
    ),
  });

  return Response.json({ runId }, { status: 202 });
}
