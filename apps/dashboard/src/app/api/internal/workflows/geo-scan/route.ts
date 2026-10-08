import { geoScanWorkflowPayloadSchema } from "@notra/geo-core/schemas/geo-workflows";

import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { startGeoScanRun } from "@/lib/workflows/start";
import { ratelimit } from "@/utils/ratelimit";

/**
 * Starts the GEO scan workflow on behalf of the public API.
 *
 * Deliberately has no already-running guard, unlike the cron sweep. The
 * caller (`startGeoScan` in `@notra/geo-core`, running inside
 * `apps/api`) stamps `geo_settings.scanStartedAt` *before* it reaches this
 * endpoint, so an `isGeoScanRunning` check here would reject every request it
 * was meant to admit. The overlap guard lives in the public scan route, which
 * checks before that stamp is written.
 *
 * The caller's `claimedAt` and `scanId` are forwarded verbatim into the
 * workflow payload: the first is the token the run needs to end the claim it
 * was started under, the second is the `geo_scans` row the caller already
 * inserted and handed to its own client to poll, which the run adopts instead
 * of creating one.
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

  const parsed = geoScanWorkflowPayloadSchema.safeParse(body);
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

  const { runId } = await startGeoScanRun(parsed.data);
  return Response.json({ runId }, { status: 202 });
}
