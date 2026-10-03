import { flushLogs } from "@notra/ai/evlog";
import { isDemoMode } from "@notra/utils/demo-mode";
import { Effect, Result } from "effect";

import { checkMissedGeoScans } from "@/lib/analytics/geo-scan-watchdog";
import { runMonitoringSweep } from "@/lib/analytics/monitoring-sweep";
import { scheduleRequestErrorTelemetry } from "@/utils/request-error-telemetry";
import { retryWorkflowFailureAlerts } from "@/utils/workflow-failure-alert";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // The public demo runs no background jobs; scans start on demand. Checked
  // after auth so reading the request keeps this route dynamic (a static
  // 204 breaks the build).
  if (isDemoMode()) {
    return new Response(null, { status: 204 });
  }
  try {
    await checkMissedGeoScans();
  } catch (error) {
    logWorkflowTelemetry({
      event: "geo.scan.watchdog.failed",
      outcome: "error",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    await retryWorkflowFailureAlerts();
  } catch (error) {
    logWorkflowTelemetry({
      event: "workflow.alert.failed",
      outcome: "error",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
  if (!process.env.AXIOM_TOKEN) {
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
