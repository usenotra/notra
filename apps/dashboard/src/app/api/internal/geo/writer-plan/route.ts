import { logError } from "@notra/ai/utils/server-log";
import { toGeoFailureWire } from "@notra/geo-core/geo/failure-wire";
import { refreshGeoContentGapsBestEffort } from "@notra/geo-core/geo/gaps";
import { planGeoContentBrief } from "@notra/geo-core/geo/writer";
import { geoWriterPlanInputSchema } from "@notra/geo-core/schemas/geo";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { ratelimit } from "@/utils/ratelimit";

/** Status the API turns back into a mapped GEO error. */
const GEO_FAILURE_STATUS = 422;

/**
 * Plans one GEO content brief on behalf of the public API.
 *
 * `planGeoContentBrief` reserves and settles AI credits through the dashboard's
 * `GeoContentBillingService` layer, which binds Vercel Workflow `"use step"`
 * capabilities, and it calls the planner model. Neither exists in the API
 * process, so the work happens here — the same arrangement as `sequence-run`
 * next door, and for the same reason.
 *
 * `createdByUserId` is left undefined: the caller is an API key, not a person.
 *
 * On failure the tagged domain error is returned as-is (see `GeoFailureWire`)
 * so the API maps it onto a status with its own mapper rather than this route
 * guessing one.
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

  const parsed = geoWriterPlanInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // The same limiter the dashboard's `geo.writerPlan` procedure uses, so both
  // surfaces draw from one per-organization budget.
  const { success } = await ratelimit.geoWriterPlan.limit(
    parsed.data.organizationId
  );
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  const outcome = await Effect.runPromise(
    Effect.result(
      planGeoContentBrief(parsed.data, undefined).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    )
  );

  if (outcome._tag === "Failure") {
    logError("[GEO] Internal writer plan failed", outcome.failure);
    return Response.json(
      { failure: toGeoFailureWire(outcome.failure) },
      { status: GEO_FAILURE_STATUS }
    );
  }

  await Effect.runPromise(refreshGeoContentGapsBestEffort(parsed.data));
  return Response.json(outcome.success, { status: 200 });
}
