import { Cause, Effect } from "effect";

import { MonitoringOperationError } from "@/schemas/monitoring-error";
import type { MonitoringOperationInput } from "@/types/workflow-monitoring";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

export const readMonitoringOperation = Effect.fn("monitoring.readOperation")(
  function* <A>(input: MonitoringOperationInput, read: () => Promise<A>) {
    const operation =
      input.timeoutMs > 0
        ? Effect.tryPromise({ try: read, catch: (error) => error }).pipe(
            Effect.timeout(input.timeoutMs)
          )
        : Effect.fail(new Cause.TimeoutError("Monitoring budget exhausted"));
    return yield* operation.pipe(
      Effect.mapError(
        (error) =>
          new MonitoringOperationError({
            operation: input.operation,
            errorName: error instanceof Error ? error.name : "UnknownError",
          })
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          logWorkflowTelemetry({
            event: "monitoring.operation.failed",
            operation: input.operation,
            sweepId: input.sweepId,
            runId: input.runId,
            jobStatus: input.jobStatus,
            outcome: "error",
            errorName: error.errorName,
          });
        })
      )
    );
  }
);
