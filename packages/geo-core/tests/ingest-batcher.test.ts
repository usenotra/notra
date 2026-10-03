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

function event(id: string): GeoTrafficEventRow {
  return { request_id: id } as GeoTrafficEventRow;
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

  test("drops rejected payloads instead of blocking later events", async () => {
    const rejection = Object.assign(new Error("Invalid row"), {
      statusCode: 400,
    });
    const write = mock(async (rows: GeoTrafficEventRow[]) => {
      if (rows[0]?.request_id === "bad") {
        throw rejection;
      }
      return STORED;
    });
    const batcher = createGeoEventBatcher({
      intervalMs: 0,
      maxRowsPerWrite: 1,
      write,
    });
    batcher.enqueue(event("bad"));
    batcher.enqueue(event("good"));
    await batcher.flush();

    expect(write).toHaveBeenCalledTimes(2);
    expect(batcher.size()).toBe(0);
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
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(write).toHaveBeenCalledTimes(1);
    await batcher.stop();
  });
});
