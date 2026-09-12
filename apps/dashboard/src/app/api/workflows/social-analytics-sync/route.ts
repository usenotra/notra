import { getAppUrl } from "@notra/ai/qstash/triggers";
import { socialAnalyticsSyncPayloadSchema } from "@notra/schemas/dashboard/analytics";
import { flattenError } from "zod";

import { verifyQstashSignature } from "@/lib/workflows/qstash-verify";
import { startSocialAnalyticsSyncRun } from "@/lib/workflows/start";

const ROUTE_PATH = "/api/workflows/social-analytics-sync";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyQstashSignature({
    request,
    rawBody,
    url: `${getAppUrl()}${ROUTE_PATH}`,
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

  const parsed = socialAnalyticsSyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "[Social Analytics] Invalid sync payload:",
      flattenError(parsed.error)
    );
    return new Response("Invalid payload", { status: 400 });
  }

  const { runId } = await startSocialAnalyticsSyncRun(parsed.data);
  return Response.json({ runId }, { status: 202 });
}
