import { expect, test } from "bun:test";

import { createDb } from "@notra/db/drizzle";

import {
  INGEST_DATABASE_CLOSE_TIMEOUT_MS,
  INGEST_DRAIN_TIMEOUT_MS,
  INGEST_EVENTS_FLUSH_TIMEOUT_MS,
  INGEST_FLUSH_TIMEOUT_MS,
} from "../src/constants/server";
import { retainIngestDatabaseConnections } from "../src/utils/retain-database-connections";

test("retains worker connections without changing shared pool defaults or safety limits", async () => {
  // Construct pools only: this test never connects to either database.
  const worker = createDb(
    "postgres://test:test@127.0.0.1:1/worker-pool"
  ).$client;
  const sibling = createDb(
    "postgres://test:test@127.0.0.1:1/sibling-pool"
  ).$client;
  const maximum = worker.options.max;
  try {
    retainIngestDatabaseConnections(worker);
    expect(worker.options.idleTimeoutMillis).toBe(0);
    expect(worker.options.max).toBe(maximum);
    expect(worker.options.connectionTimeoutMillis).toBe(10_000);
    expect(worker.listenerCount("error")).toBeGreaterThan(0);
    expect(sibling.options.idleTimeoutMillis).toBe(10_000);
    expect(
      INGEST_DRAIN_TIMEOUT_MS +
        INGEST_EVENTS_FLUSH_TIMEOUT_MS +
        INGEST_DATABASE_CLOSE_TIMEOUT_MS +
        INGEST_FLUSH_TIMEOUT_MS
    ).toBeLessThan(60_000);
  } finally {
    await Promise.all([worker.end(), sibling.end()]);
  }
});
