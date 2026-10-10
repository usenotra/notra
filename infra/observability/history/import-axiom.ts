import { readFileSync } from "node:fs";

import { historySnapshot } from "./schemas/history.ts";
import { projectDay } from "./utils/project-day.ts";
import { pushHistory } from "./utils/push-history.ts";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (!Array.isArray(input) || input.length > 24) {
    throw new Error("History aggregate cap reached");
  }
  const events = input.map(projectDay);
  const snapshot = historySnapshot(
    events[0]?.snapshotStart,
    events[0]?.snapshotEnd
  );
  if (
    events.some(
      (event) =>
        event.snapshotEnd !== snapshot.snapshotEnd ||
        event.snapshotStart !== snapshot.snapshotStart
    ) ||
    new Set(events.map((event) => event.callId)).size !== events.length
  ) {
    throw new Error("Mixed or repeated history buckets");
  }
  if (process.argv.includes("--apply")) {
    await pushHistory(
      events,
      `notra-history-axiom-${snapshot.snapshotEnd.slice(0, 10).replaceAll("-", "")}`,
      snapshot
    );
  }
  console.log(
    JSON.stringify({
      aggregates: events.length,
      applied: process.argv.includes("--apply"),
    })
  );
} catch {
  console.error(
    "Aggregate import failed; data and provider responses suppressed"
  );
  process.exitCode = 1;
}
