import { flushLogs } from "@notra/ai/evlog";
import { Effect, Result } from "effect";

import { checkMissedGeoScans } from "@/lib/analytics/geo-scan-watchdog";
import { runMonitoringSweep } from "@/lib/analytics/monitoring-sweep";
import { scheduleRequestErrorTelemetry } from "@/utils/request-error-telemetry";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await checkMissedGeoScans();
  } catch (error) {
    logWorkflowTelemetry({
      event: "geo.scan.watchdog_failed",
      outcome: "error",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
  if (!process.env.AXIOM_TOKEN || !process.env.AXIOM_AI_DATASET) {
    scheduleRequestErrorTelemetry(flushLogs);
    return Response.json({ skipped: "telemetry_not_configured" });
  }
  const sweepId = crypto.randomUUID();
  try {
    const result = await Effect.runPromise(
      runMonitoringSweep(sweepId).pipe(Effect.result)
    );
    if (Result.isFailure(result)) {
      logWorkflowTelemetry({
        event: "monitoring.sweep.completed",
        sweepId,
        outcome: "error",
        errors: 1,
        operation: result.failure.operation,
        errorName: result.failure.errorName,
      });
      return Response.json(
        { error: "Monitoring sweep failed" },
        { status: 500 }
      );
    }
    return Response.json(result.success);
  } catch (error) {
    logWorkflowTelemetry({
      event: "monitoring.sweep.completed",
      sweepId,
      outcome: "error",
      errors: 1,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Monitoring sweep failed" }, { status: 500 });
  } finally {
    scheduleRequestErrorTelemetry(flushLogs);
  }
}
