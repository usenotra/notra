import assert from "node:assert/strict";
import { test } from "node:test";

import type { DrainContext } from "evlog";

import { createCheckpointPipeline } from "./checkpoint-pipeline";

test("flush checkpoints ignore later arrivals, share promises and track pending work", async () => {
  const gates = Array.from({ length: 4 }, () => {
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => {
      resolve = complete;
    });
    return { promise, resolve };
  });
  const started = gates.slice(0, 2);
  const releases = gates.slice(2);
  let sends = 0;
  const pipeline = createCheckpointPipeline(
    async () => {
      const index = sends++;
      started[index]?.resolve();
      await releases[index]?.promise;
    },
    { batch: { size: 1, intervalMs: 2000 }, retry: { maxAttempts: 1 } }
  );
  const context: DrainContext = {
    event: {
      timestamp: new Date().toISOString(),
      level: "info",
      service: "fixture",
      environment: "test",
    },
  };
  try {
    pipeline(context);
    const firstFlush = pipeline.flush();
    assert.equal(pipeline.flush(), firstFlush);
    pipeline(context);
    const secondFlush = pipeline.flush();
    let secondDone = false;
    void secondFlush.then(() => {
      secondDone = true;
    });
    assert.equal(pipeline.pending, 2);
    await started[0]?.promise;
    releases[0]?.resolve();
    await firstFlush;
    assert.equal(secondDone, false);
    assert.equal(pipeline.pending, 1);
    await started[1]?.promise;
    releases[1]?.resolve();
    await secondFlush;
    assert.equal(pipeline.pending, 0);
    await pipeline.flush();
  } finally {
    for (const release of releases) {
      release.resolve();
    }
    await pipeline.flush();
  }
});
