import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { sql } from "drizzle-orm";
import { Clock, Effect } from "effect";

import { WORKFLOW_MONITORING } from "@/constants/workflow-monitoring";
import { MonitoringOperationError } from "@/schemas/monitoring-error";
import { logWorkflowTelemetry } from "@/utils/workflow-telemetry";

const checkDependency = Effect.fn("monitoring.checkDependency")(function* (
  dependency: string,
  check: () => Promise<unknown>
) {
  const startedAt = yield* Clock.currentTimeMillis;
  yield* Effect.tryPromise({ try: check, catch: (error) => error }).pipe(
    Effect.timeout(WORKFLOW_MONITORING.operationTimeoutMs),
    Effect.mapError(
      (error) =>
        new MonitoringOperationError({
          operation: dependency,
          errorName: error instanceof Error ? error.name : "UnknownError",
        })
    ),
    Effect.matchEffect({
      onSuccess: () =>
        Effect.gen(function* () {
          const completedAt = yield* Clock.currentTimeMillis;
          logWorkflowTelemetry({
            event: "backend.dependency.checked",
            dependency,
            outcome: "success",
            durationMs: completedAt - startedAt,
          });
        }),
      onFailure: (error) =>
        Effect.gen(function* () {
          const completedAt = yield* Clock.currentTimeMillis;
          logWorkflowTelemetry({
            event: "backend.dependency.checked",
            dependency,
            outcome: "error",
            errorName: error.errorName,
            durationMs: completedAt - startedAt,
          });
        }),
    })
  );
});

export const checkBackendHealth = Effect.fn("monitoring.checkBackendHealth")(
  function* () {
    const client = redis;
    yield* Effect.all(
      [
        checkDependency("postgres", async () => db.execute(sql`select 1`)),
        ...(client ? [checkDependency("redis", () => client.ping())] : []),
      ],
      { concurrency: "unbounded", discard: true }
    );
  }
);
