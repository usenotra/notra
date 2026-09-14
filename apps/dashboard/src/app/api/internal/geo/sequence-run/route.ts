import { toGeoFailureWire } from "@notra/geo-core/geo/failure-wire";
import { runGeoSequenceNow } from "@notra/geo-core/geo/scan";
import { geoSequenceRunInputSchema } from "@notra/geo-core/schemas/geo";
import { Effect } from "effect";

import { scheduleGeoShelfCitationSync } from "@/lib/geo-shelf/service";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { ratelimit } from "@/utils/ratelimit";

/** Status the API turns back into a mapped GEO error. */
const GEO_FAILURE_STATUS = 422;

/**
 * Runs one GEO prompt sequence on behalf of the public API.
 *
 * `runGeoSequenceNow` calls answer engines directly and gates content billing
 * through `"use step"` capabilities, neither of which exists in the API
 * process — so the work has to happen here, exactly as it does for the
 * dashboard's own `geo.sequenceRun` procedure.
 *
 * There is no GEO sequence workflow to hand off to, so this runs the sequence
 * to completion and only then answers, with the run's real result. It used to
 * answer `{ runId }` with a freshly minted id that identified nothing, which
 * told a caller neither what happened nor what to poll.
 *
 * TODO(Phase 6 — durable workflow): move this onto a real GEO sequence
 * workflow so the API can hand off and return a run id a client can follow,
 * instead of both processes holding a request open for the whole run.
 *
 * On failure the tagged domain error is returned as-is (see `GeoFailureWire`)
 * so the API maps it onto a status with its own mapper, matching `writer-plan`
 * next door.
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

  const parsed = geoSequenceRunInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { success } = await ratelimit.geoSequenceRun.limit(
    parsed.data.organizationId
  );
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  const outcome = await Effect.runPromise(
    Effect.result(
      runGeoSequenceNow(parsed.data, parsed.data.sequenceId).pipe(
        Effect.provide(geoCoreDashboardLayer)
      )
    )
  );

  if (outcome._tag === "Failure") {
    console.error("[GEO] Internal sequence run failed:", outcome.failure);
    return Response.json(
      { failure: toGeoFailureWire(outcome.failure) },
      { status: GEO_FAILURE_STATUS }
    );
  }

  if (outcome.success.checks > 0) {
    scheduleGeoShelfCitationSync(parsed.data);
  }

  return Response.json(outcome.success, { status: 200 });
}
