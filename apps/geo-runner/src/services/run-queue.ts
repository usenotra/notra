import {
  executeGeoAdhocScan,
  failStaleGeoAdhocScans,
} from "@notra/geo-core/geo/adhoc-scan";
import {
  describeGeoCause,
  flushGeoLogEffect,
  geoLogError,
} from "@notra/geo-core/utils/geo-log";
import { Context, Effect, Layer, Queue, Schedule } from "effect";

import {
  RUNNER_QUEUE_CAPACITY,
  RUNNER_SCAN_CONCURRENCY,
  RUNNER_STALE_SWEEP_INTERVAL,
} from "../constants/runner";
import { geoRunnerLayer } from "../layers/geo";

export class RunQueue extends Context.Service<
  RunQueue,
  {
    /** False when the backlog is full; the scan stays `queued` for a retry. */
    readonly offer: (scanId: string) => Effect.Effect<boolean>;
  }
>()("geo-runner/RunQueue") {}

/**
 * In-process backlog. The scan row is the durable state: a scan lost with the
 * process is failed by the stale sweep, so no broker is needed.
 */
export const runQueueLive = Layer.effect(
  RunQueue,
  Effect.gen(function* () {
    const queue = yield* Queue.dropping<string>(RUNNER_QUEUE_CAPACITY);

    const worker = Queue.take(queue).pipe(
      Effect.flatMap((scanId) =>
        executeGeoAdhocScan(scanId).pipe(
          Effect.provide(geoRunnerLayer),
          Effect.catchCause((cause) =>
            geoLogError({
              event: "geo.runner.scan_crashed",
              scanId,
              ...describeGeoCause(cause),
            }).pipe(Effect.andThen(flushGeoLogEffect))
          )
        )
      ),
      Effect.forever
    );
    yield* Effect.forkScoped(
      Effect.all(
        Array.from({ length: RUNNER_SCAN_CONCURRENCY }, () => worker),
        { concurrency: "unbounded", discard: true }
      )
    );

    yield* Effect.forkScoped(
      failStaleGeoAdhocScans().pipe(
        Effect.catchCause((cause) =>
          geoLogError({
            event: "geo.runner.stale_sweep_failed",
            ...describeGeoCause(cause),
          }).pipe(Effect.andThen(flushGeoLogEffect))
        ),
        Effect.repeat(Schedule.spaced(RUNNER_STALE_SWEEP_INTERVAL))
      )
    );

    return RunQueue.of({
      offer: (scanId) => Queue.offer(queue, scanId),
    });
  })
);
