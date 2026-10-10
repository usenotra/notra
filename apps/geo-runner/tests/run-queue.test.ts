import { expect, mock, test } from "bun:test";

import { Effect, Layer, ManagedRuntime, Queue } from "effect";

import {
  RUNNER_QUEUE_CAPACITY,
  RUNNER_SCAN_CONCURRENCY,
} from "../src/constants/runner";

const started = await Effect.runPromise(Queue.unbounded<string>());
const interrupted: string[] = [];

mock.module("@notra/geo-core/geo/adhoc-scan", () => ({
  executeGeoAdhocScan: (scanId: string) =>
    Queue.offer(started, scanId).pipe(
      Effect.andThen(Effect.never),
      Effect.ensuring(Effect.sync(() => interrupted.push(scanId)))
    ),
  failStaleGeoAdhocScans: () => Effect.void,
}));
mock.module("@notra/geo-core/utils/geo-log", () => ({
  describeGeoCause: () => ({}),
  flushGeoLogEffect: Effect.void,
  geoLogError: () => Effect.void,
}));
mock.module("../src/layers/geo", () => ({ geoRunnerLayer: Layer.empty }));

const { RunQueue, runQueueLive } = await import("../src/services/run-queue");

test("bounds the backlog, deduplicates offers, and drains before interruption", async () => {
  const runtime = ManagedRuntime.make(runQueueLive);
  try {
    const queue = await runtime.runPromise(RunQueue);
    const offer = (scanId: string) => runtime.runPromise(queue.offer(scanId));
    for (let index = 0; index < RUNNER_SCAN_CONCURRENCY; index++) {
      const scanId = `active-${index}`;
      expect(await offer(scanId)).toBe(true);
      expect(await Effect.runPromise(Queue.take(started))).toBe(scanId);
    }
    for (let index = 0; index < RUNNER_QUEUE_CAPACITY; index++) {
      expect(await offer(`queued-${index}`)).toBe(true);
    }
    expect(await offer("queued-0")).toBe(true);
    expect(await offer("active-0")).toBe(true);
    expect(await offer("overflow")).toBe(false);

    await runtime.runPromise(queue.drain());
    expect(await offer("after-drain")).toBe(false);
    expect(await offer("active-0")).toBe(false);
  } finally {
    await runtime.dispose();
  }
  expect(interrupted.sort()).toEqual(
    Array.from(
      { length: RUNNER_SCAN_CONCURRENCY },
      (_, index) => `active-${index}`
    )
  );
}, 5000);
