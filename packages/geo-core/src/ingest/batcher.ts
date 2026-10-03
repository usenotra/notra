import { geoLog } from "@notra/ai/evlog";
import { ingestGeoTrafficEvents } from "@notra/analytics/tinybird/client";
import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";

import {
  GEO_INGEST_FLUSH_MAX_ROWS,
  GEO_INGEST_FLUSH_TIMEOUT_MS,
  GEO_INGEST_MAX_BUFFERED_EVENTS,
} from "../constants/ingest";
import {
  getGeoIngestRegion,
  getGeoIngestRuntime,
} from "../utils/ingest-runtime";

type GeoEventWriteResult = Awaited<ReturnType<typeof ingestGeoTrafficEvents>>;

interface GeoEventBatcherOptions {
  intervalMs: number;
  maxBufferedEvents?: number;
  maxRowsPerWrite?: number;
  write?: (rows: GeoTrafficEventRow[]) => Promise<GeoEventWriteResult>;
  now?: () => number;
}

export interface GeoEventBatcher {
  enqueue: (event: GeoTrafficEventRow) => boolean;
  flush: () => Promise<void>;
  /** Stops the flush timer and writes whatever is still buffered. */
  stop: () => Promise<void>;
  size: () => number;
}

/** A write that may succeed if tried again later. */
class RetryableWriteError extends Error {}

// Tinybird rejected the payload itself; resending it can never succeed.
const PERMANENT_STATUS_CODES = new Set([400, 413, 422]);

/**
 * Network failures, timeouts, rate limits, server errors and auth/config
 * problems are retried. Rejected payloads and the SDK's own client-side
 * validation errors are not: retrying them would block every later event.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof RetryableWriteError || error instanceof TypeError) {
    return true;
  }
  if (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return !PERMANENT_STATUS_CODES.has(error.statusCode);
  }
  return false;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new RetryableWriteError(
              `Tinybird write timed out after ${timeoutMs}ms`
            )
          ),
        timeoutMs
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Buffers geo traffic events in memory and writes them to Tinybird in
 * batches on wall-clock aligned boundaries (e.g. :00, :05, :10 for a 5 min
 * interval). Alignment matters more than batching: Tinybird bills every
 * minute with any write as a full active minute, so replicas flushing at
 * the same boundary share one billed minute instead of each adding their own.
 *
 * Failed writes go back to the front of the buffer and retry on the next
 * boundary. The buffer is bounded; when full, `enqueue` refuses the event so
 * the caller can write it directly instead of losing it.
 */
export function createGeoEventBatcher(
  options: GeoEventBatcherOptions
): GeoEventBatcher {
  const {
    intervalMs,
    maxBufferedEvents = GEO_INGEST_MAX_BUFFERED_EVENTS,
    maxRowsPerWrite = GEO_INGEST_FLUSH_MAX_ROWS,
    write = ingestGeoTrafficEvents,
    now = Date.now,
  } = options;

  let buffer: GeoTrafficEventRow[] = [];
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  async function writeAll(rows: GeoTrafficEventRow[]): Promise<void> {
    const startedAt = performance.now();
    const context = {
      runtime: getGeoIngestRuntime(),
      region: getGeoIngestRegion(),
    };
    let written = 0;
    let quarantined = 0;
    let rejected = 0;
    for (let start = 0; start < rows.length; start += maxRowsPerWrite) {
      const chunk = rows.slice(start, start + maxRowsPerWrite);
      try {
        const result = await withTimeout(
          write(chunk),
          GEO_INGEST_FLUSH_TIMEOUT_MS
        );
        if (!result) {
          throw new RetryableWriteError("Tinybird is not configured");
        }
        written += result.successful_rows;
        quarantined += result.quarantined_rows;
      } catch (error) {
        if (!isRetryable(error)) {
          rejected += chunk.length;
          geoLog.error({
            event: "geo.ingest.flush",
            outcome: "rejected",
            rows: chunk.length,
            errorMessage: errorMessage(error),
            ...context,
          });
          continue;
        }
        // At-least-once: a timed-out write may still land, so a retry can
        // duplicate rows; losing them is the worse outcome for analytics.
        // Rows that arrived during the write sit behind the retried ones,
        // and overflow drops the oldest events.
        const retry = [...rows.slice(start), ...buffer];
        const dropped = Math.max(0, retry.length - maxBufferedEvents);
        buffer = retry.slice(dropped);
        geoLog.error({
          event: "geo.ingest.flush",
          outcome: "failed",
          rows: rows.length,
          written,
          retrying: buffer.length,
          dropped,
          errorMessage: errorMessage(error),
          durationMs: Math.round(performance.now() - startedAt),
          ...context,
        });
        return;
      }
    }
    const fields = {
      event: "geo.ingest.flush",
      rows: rows.length,
      written,
      quarantined,
      rejected,
      durationMs: Math.round(performance.now() - startedAt),
      ...context,
    } as const;
    // Quarantined or rejected rows failed Tinybird's checks and would fail
    // again, so they are reported instead of retried.
    if (quarantined > 0 || rejected > 0) {
      geoLog.error({ ...fields, outcome: "partial" });
    } else {
      geoLog.info({ ...fields, outcome: "written" });
    }
  }

  function flush(): Promise<void> {
    if (inFlight) {
      return inFlight;
    }
    if (buffer.length === 0) {
      return Promise.resolve();
    }
    const rows = buffer;
    buffer = [];
    inFlight = writeAll(rows).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  function schedule() {
    if (stopped || intervalMs <= 0) {
      return;
    }
    const current = now();
    const delay = intervalMs - (current % intervalMs);
    timer = setTimeout(() => {
      flush().finally(schedule);
    }, delay);
  }

  schedule();

  return {
    enqueue(event) {
      if (stopped || buffer.length >= maxBufferedEvents) {
        return false;
      }
      buffer.push(event);
      return true;
    },
    flush,
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await inFlight;
      await flush();
    },
    size: () => buffer.length,
  };
}
