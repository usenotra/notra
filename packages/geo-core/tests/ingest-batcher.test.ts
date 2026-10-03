import { describe, expect, mock, test } from "bun:test";

import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";

const geoLogError = mock((_event: Record<string, unknown>) => {});
mock.module("@notra/ai/evlog", () => ({
  geoLog: { info: () => {}, warn: () => {}, error: geoLogError },
}));
mock.module("@notra/analytics/tinybird/client", () => ({
  ingestGeoTrafficEvents: async () => null,
}));

const { createGeoEventBatcher } = await import("../src/ingest/batcher");

const STORED = { successful_rows: 1, quarantined_rows: 0 };

function event(id: string, organizationId = "org_1"): GeoTrafficEventRow {
  return {
    request_id: id,
    organization_id: organizationId,
  } as GeoTrafficEventRow;
}

function tick(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createGeoEventBatcher", () => {
  test("writes buffered events in chunks on flush", async () => {
    const write = mock(async (_rows: GeoTrafficEventRow[]) => STORED);
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      maxRowsPerWrite: 2,
      write,
    });
    for (const id of ["a", "b", "c"]) {
      batcher.enqueue(event(id));
    }
    await batcher.flush();

    expect(write.mock.calls.map(([rows]) => rows.length)).toEqual([2, 1]);
    expect(batcher.size()).toBe(0);
  });

  test("keeps failed rows ahead of newer ones for the next flush", async () => {
    let fail = true;
    const written: string[] = [];
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      write: async (rows) => {
        if (fail) {
          throw new TypeError("fetch failed");
        }
        written.push(...rows.map((row) => row.request_id));
        return STORED;
      },
    });
    batcher.enqueue(event("a"));
    await batcher.flush();
    batcher.enqueue(event("b"));
    fail = false;
    await batcher.flush();

    expect(written).toEqual(["a", "b"]);
    expect(geoLogError).toHaveBeenCalledTimes(1);
  });

  test("isolates a rejected row instead of dropping its whole chunk", async () => {
    const rejection = Object.assign(new Error("Invalid row"), {
      statusCode: 400,
    });
    const written: string[] = [];
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      write: async (rows) => {
        if (rows.some((row) => row.request_id === "bad")) {
          throw rejection;
        }
        written.push(...rows.map((row) => row.request_id));
        return STORED;
      },
    });
    for (const id of ["a", "b", "bad", "c"]) {
      batcher.enqueue(event(id));
    }
    await batcher.flush();

    expect(written.toSorted()).toEqual(["a", "b", "c"]);
    expect(batcher.size()).toBe(0);
  });

  test("keeps every acknowledged row when a retry overfills the buffer", async () => {
    let fail = true;
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      maxBufferedEvents: 2,
      write: async () => {
        if (fail) {
          throw new TypeError("fetch failed");
        }
        return STORED;
      },
    });
    batcher.enqueue(event("a"));
    batcher.enqueue(event("b"));
    const flushing = batcher.flush();
    batcher.enqueue(event("c"));
    batcher.enqueue(event("d"));
    await flushing;

    expect(batcher.size()).toBe(4);
    expect(batcher.enqueue(event("e"))).toBe(false);
    fail = false;
  });

  test("expedites only the watched organization and reports what was written", async () => {
    const written: string[][] = [];
    const write = mock(async (_rows: GeoTrafficEventRow[]) => STORED);
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      liveFlushDelayMs: 0,
      write,
      onWritten: (rows) => written.push(rows.map((row) => row.request_id)),
    });
    batcher.enqueue(event("a1", "org_live"));
    batcher.enqueue(event("b1", "org_other"));
    batcher.enqueue(event("a2", "org_live"));
    batcher.expedite("org_live");
    batcher.expedite("org_live");
    await tick();

    expect(write).toHaveBeenCalledTimes(1);
    expect(written).toEqual([["a1", "a2"]]);
    expect(batcher.size()).toBe(1);
  });

  test("retries a failed live write without waiting for the window", async () => {
    let attempts = 0;
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      liveFlushDelayMs: 0,
      liveRetryDelayMs: 0,
      write: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError("fetch failed");
        }
        return STORED;
      },
    });
    batcher.enqueue(event("a", "org_live"));
    batcher.expedite("org_live");
    await tick(30);

    expect(attempts).toBe(2);
    expect(batcher.size()).toBe(0);
  });

  test("shutdown waits for a live write that is still in flight", async () => {
    let finish: () => void = () => {};
    let done = false;
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      liveFlushDelayMs: 0,
      write: () =>
        new Promise((resolve) => {
          finish = () => {
            done = true;
            resolve(STORED);
          };
        }),
    });
    batcher.enqueue(event("a", "org_live"));
    batcher.expedite("org_live");
    await tick();
    const stopping = batcher.stop();
    await tick();
    expect(done).toBe(false);
    finish();
    await stopping;
    expect(done).toBe(true);
  });

  test("refuses events once the buffer is full", () => {
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      maxBufferedEvents: 1,
      write: async () => STORED,
    });
    expect(batcher.enqueue(event("a"))).toBe(true);
    expect(batcher.enqueue(event("b"))).toBe(false);
  });

  test("flushes on the next wall-clock boundary", async () => {
    const write = mock(async () => STORED);
    const batcher = createGeoEventBatcher({
      intervalMs: 50,
      now: () => 40,
      write,
    });
    batcher.enqueue(event("a"));
    await tick(30);
    expect(write).toHaveBeenCalledTimes(1);
    await batcher.stop();
  });
});
