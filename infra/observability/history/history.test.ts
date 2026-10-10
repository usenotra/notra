import assert from "node:assert/strict";
import { test } from "node:test";

import { historyDate, historySnapshot } from "./schemas/history.ts";
import type { HistoryEvent, HistoryPayload } from "./types/history.ts";
import { projectDay } from "./utils/project-day.ts";
import { pushHistory } from "./utils/push-history.ts";

const sample = {
  kind: "api",
  timestamp: "2026-10-04T23:59:59.999Z",
  bucketStart: "2026-10-04T00:00:00Z",
  snapshotStart: "2026-10-03T11:35:08.391Z",
  snapshotEnd: "2026-10-10T11:35:08.391Z",
  calls: 10,
  errors: 0,
};
const snapshot = historySnapshot(sample.snapshotStart, sample.snapshotEnd);

test("history requires real canonical UTC dates and one exact seven-day identity", () => {
  assert.deepEqual(
    historySnapshot("2026-10-03T12:00:00Z", "2026-10-10T12:00:00Z"),
    {
      snapshotStart: "2026-10-03T12:00:00.000Z",
      snapshotEnd: "2026-10-10T12:00:00.000Z",
    }
  );
  assert.throws(
    () => historyDate("2026-02-30T00:00:00Z"),
    /Invalid history date/
  );
  assert.throws(
    () => projectDay({ ...sample, snapshotStart: "2026-10-10T10:00:00Z" }),
    /exactly seven days/
  );
  assert.throws(() =>
    projectDay({ ...sample, timestamp: "2026-10-21T00:00:00Z" })
  );
});

test("projection preserves imported IDs and zero, omits unknown measurements and strips raw content", () => {
  const event = projectDay({
    ...sample,
    prompt: "private",
    token: "private",
    organizationId: "private@example.test",
  });
  assert.equal(event.callId, "axiom:20261010T113508391Z:api:2026-10-04");
  assert.equal(event.errors, 0);
  assert.equal("totalTokens" in event, false);
  assert.equal(projectDay({ ...sample, totalTokens: 0 }).totalTokens, 0);
  assert.equal(JSON.stringify(event).includes("private"), false);
  assert.deepEqual(
    event,
    projectDay({ ...sample, bucketStart: "2026-10-04T00:00:00.000Z" })
  );
  assert.throws(() => projectDay({ ...sample, calls: -1 }));
  assert.throws(() => projectDay({ ...sample, errors: 11 }));
});

test("private ordered delivery stops on failure, replays stable batches and rejects mixed metadata before HTTP", async () => {
  const original = globalThis.fetch;
  const bodies: HistoryPayload[] = [];
  const events: HistoryEvent[] = Array.from({ length: 51 }, (_, index) => ({
    ...snapshot,
    callId: `scan:${index}`,
    timestamp: new Date(
      Date.parse("2026-10-04T02:00:00Z") - index * 60_000
    ).toISOString(),
  }));
  let inFlight = false;
  try {
    globalThis.fetch = (async (url, options) => {
      assert.equal(url, "http://loki.railway.internal:3100/loki/api/v1/push");
      assert.equal(options?.redirect, "error");
      assert.equal(inFlight, false);
      inFlight = true;
      await Promise.resolve();
      bodies.push(JSON.parse(String(options?.body)));
      inFlight = false;
      return new Response(
        bodies.length === 2 ? "private-provider-response" : null,
        { status: bodies.length === 2 ? 503 : 204 }
      );
    }) as typeof fetch;
    await assert.rejects(
      pushHistory(events, "notra-history-database-20261010", snapshot),
      {
        message: "History delivery failed (503); no response body logged",
      }
    );
    assert.equal(bodies.length, 2);
    await pushHistory(events, "notra-history-database-20261010", snapshot);
    assert.deepEqual(bodies.slice(0, 2), bodies.slice(2));
    assert.equal(
      bodies[0]?.streams[0]?.stream.history_snapshot,
      "20261010T113508391Z"
    );
    assert.equal(bodies[0]?.streams[0]?.stream.history_hour, "2026-10-04T01");
    assert.equal(bodies[1]?.streams[0]?.stream.history_hour, "2026-10-04T02");
    await assert.rejects(
      pushHistory(
        [
          ...events,
          {
            ...snapshot,
            timestamp: sample.timestamp,
            snapshotStart: "2026-10-10T10:00:00Z",
          },
        ],
        "notra-history-database-20261010",
        snapshot
      )
    );
    assert.equal(
      bodies.length,
      4,
      "Invalid metadata cannot partially reach Loki"
    );
  } finally {
    globalThis.fetch = original;
  }
});
