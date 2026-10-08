import { geoWriterWorkflowPayloadSchema } from "@notra/geo-core/schemas/geo-workflows";

import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { startGeoWriterRun } from "@/lib/workflows/start";
import { ratelimit } from "@/utils/ratelimit";

/**
 * Starts the GEO writer workflow on behalf of the public API.
 *
 * Mirrors the geo-scan route next door. The API runs
 * `approveAndStartGeoWriter` itself — it can claim the brief row and create the
 * draft post with nothing but the database — but the Vercel Workflow runtime
 * only exists here, so the final hand-off comes back over this endpoint as
 * `GeoWorkflowService.startGeoWriterRun`.
 *
 * The brief has already been claimed (`status = "writing"`) by the time this
 * runs, and geo-core rolls that claim back if this call fails.
 */
export async function POST(request: Request) {
  const authorized = await verifyInternalWorkflowRequest(request);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const parsed = geoWriterWorkflowPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { success } = await ratelimit.internalWorkflowStart.limit(
    parsed.data.organizationId
  );
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  const { runId } = await startGeoWriterRun(parsed.data);
  return Response.json({ runId }, { status: 202 });
}
