import { getAppUrl } from "@notra/ai/qstash/triggers";
import { logError } from "@notra/ai/utils/server-log";
import { GSC_SYNC_WORKFLOW_PATH } from "@notra/geo-core/constants/google-search-console";
import { gscSyncPayloadSchema } from "@notra/geo-core/schemas/google-search-console";
import { flattenError } from "zod";

import { verifyQstashSignature } from "@/lib/workflows/qstash-verify";
import { startGscSyncRun } from "@/lib/workflows/start";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyQstashSignature({
    request,
    rawBody,
    url: `${getAppUrl()}${GSC_SYNC_WORKFLOW_PATH}`,
  });
  if (!verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }
  }

  const parsed = gscSyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    logError("[GSC] Invalid sync payload", undefined, {
      issues: flattenError(parsed.error),
    });
    return new Response("Invalid payload", { status: 400 });
  }

  const { runId } = await startGscSyncRun(parsed.data);
  return Response.json({ runId }, { status: 202 });
}
