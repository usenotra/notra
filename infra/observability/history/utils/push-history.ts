import { historyDate, historySnapshot } from "../schemas/history.ts";
import type { HistoryEvent, HistorySnapshot } from "../types/history.ts";

/** The backfill writer can only reach the existing private Loki origin. */
export async function pushHistory(
  events: HistoryEvent[],
  service: string,
  snapshot: HistorySnapshot
) {
  if (!/^notra-history-(?:database|axiom)-\d{8}$/.test(service)) {
    throw new Error("Invalid history service");
  }
  const { snapshotStart, snapshotEnd } = historySnapshot(
    snapshot.snapshotStart,
    snapshot.snapshotEnd
  );
  if (events.length > 2001) {
    throw new Error("Invalid history snapshot");
  }
  const ordered = events
    .map((event) => {
      const timestamp = historyDate(event.timestamp);
      if (
        event.snapshotStart !== snapshotStart ||
        event.snapshotEnd !== snapshotEnd ||
        Date.parse(timestamp) < Date.parse(snapshotStart) ||
        Date.parse(timestamp) > Date.parse(snapshotEnd)
      ) {
        throw new Error("Invalid history snapshot");
      }
      return { ...event, timestamp };
    })
    .toSorted((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  for (let offset = 0; offset < ordered.length; offset += 50) {
    const response = await fetch(
      "http://loki.railway.internal:3100/loki/api/v1/push",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streams: Object.entries(
            ordered
              .slice(offset, offset + 50)
              .reduce<Record<string, HistoryEvent[]>>((groups, event) => {
                const hour = event.timestamp.slice(0, 13);
                (groups[hour] ??= []).push(event);
                return groups;
              }, {})
          ).map(([hour, records]) => ({
            stream: {
              service_name: service,
              deployment_environment_name: "production",
              history_snapshot: snapshotEnd.replaceAll(/[-:.]/g, ""),
              // Bounded hour streams keep retries inside Loki's one-hour out-of-order window.
              history_hour: hour,
            },
            values: records.map((event) => [
              String(BigInt(Date.parse(event.timestamp)) * 1_000_000n),
              JSON.stringify(event),
            ]),
          })),
        }),
      }
    );
    if (!response.ok) {
      throw new Error(
        `History delivery failed (${response.status}); no response body logged`
      );
    }
  }
}
