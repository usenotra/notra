import { geoLog } from "@notra/ai/evlog";
import type { GeoLogEvent } from "@notra/ai/types/evlog";
import type {
  GeoScanEventStep,
  GeoScanUsageByRole,
} from "@notra/db/types/geo-scan";
import { insertGeoScanEvent } from "@notra/db/utils/geo-scan-events";
import { Effect, Exit } from "effect";

import type { GeoScanBatchOutcome } from "../types/geo";
import { describeGeoCause, describeGeoError } from "./geo-log";
import { withGeoTiming } from "./geo-timing";
import { EMPTY_AGENT_TOKEN_USAGE, snapshotUsageByRole } from "./token-usage";

export interface GeoScanEventInput<A> {
  scanId: string;
  runId: string;
  step: GeoScanEventStep;
  engine?: string;
  taskKey?: string;
  usageOf?: (value: A) => GeoScanUsageByRole | null | undefined;
  /** Successful checks already land in `geo_mention_checks`. */
  persistSuccess?: boolean;
}

export function withGeoScanEvent<A, E, R>(
  operation: Effect.Effect<A, E, R>,
  fields: GeoLogEvent,
  event: GeoScanEventInput<A>
): Effect.Effect<A, E, R> {
  return Effect.suspend(() => {
    const startedAt = new Date();
    const startedMs = performance.now();
    return withGeoTiming(operation, fields).pipe(
      Effect.onExit((exit) =>
        persistGeoScanEvent(exit, event, startedAt, startedMs)
      )
    );
  });
}

function persistGeoScanEvent<A, E>(
  exit: Exit.Exit<A, E>,
  event: GeoScanEventInput<A>,
  startedAt: Date,
  startedMs: number
) {
  const failed = Exit.isFailure(exit);
  if (!failed && event.persistSuccess === false) {
    return Effect.void;
  }
  const failure = failed ? describeGeoCause(exit.cause) : undefined;
  return Effect.promise(async () => {
    try {
      await insertGeoScanEvent({
        scanId: event.scanId,
        runId: event.runId,
        step: event.step,
        status: failed ? "error" : "success",
        startedAt,
        durationMs: Math.round(performance.now() - startedMs),
        engine: event.engine,
        taskKey: event.taskKey,
        errorCode: failure?.errorName,
        errorMessage: failure?.errorMessage,
        usage:
          !failed && event.usageOf ? (event.usageOf(exit.value) ?? null) : null,
      });
    } catch (cause) {
      geoLog.error({
        event: "geo.scan.event_failed",
        scanId: event.scanId,
        runId: event.runId,
        step: event.step,
        ...describeGeoError(cause),
      });
    }
  });
}

export function batchUsageOf(outcome: GeoScanBatchOutcome): GeoScanUsageByRole {
  return snapshotUsageByRole(
    outcome.engineUsage ?? outcome.usage,
    outcome.judgeUsage ?? EMPTY_AGENT_TOKEN_USAGE
  );
}

export function withGeoScanStep<A, E, R>(
  context: {
    organizationId: string;
    projectId: string;
    scanId: string;
    runId: string;
  },
  step: GeoScanEventStep,
  operation: Effect.Effect<A, E, R>,
  usageOf?: (value: A) => GeoScanUsageByRole | null | undefined
): Effect.Effect<A, E, R> {
  return withGeoScanEvent(
    operation,
    {
      event: `geo.scan.${step}.completed`,
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      runId: context.runId,
    },
    {
      scanId: context.scanId,
      runId: context.runId,
      step,
      usageOf,
    }
  );
}
