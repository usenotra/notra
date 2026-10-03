import { geoLog } from "@notra/ai/evlog";
import { ingestGeoTrafficEvents } from "@notra/analytics/tinybird/client";
import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";

import {
  GEO_INGEST_FLUSH_MAX_ROWS,
  GEO_INGEST_FLUSH_TIMEOUT_MS,
  GEO_INGEST_LIVE_FLUSH_DELAY_MS,
  GEO_INGEST_LIVE_MAX_RETRIES,
  GEO_INGEST_LIVE_RETRY_DELAY_MS,
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
  /** Called with every chunk Tinybird accepted, e.g. to announce it live. */
  onWritten?: (rows: GeoTrafficEventRow[]) => void;
  now?: () => number;
  liveFlushDelayMs?: number;
  liveRetryDelayMs?: number;
}

type GeoFlushTrigger = "window" | "live" | "shutdown";

interface GeoWriteCounts {
  written: number;
  quarantined: number;
  rejected: number;
}

interface GeoChunkResult extends GeoWriteCounts {
  /** Rows a retryable failure left unwritten, in their original order. */
  pending: GeoTrafficEventRow[];
  error?: unknown;
}

const EMPTY_COUNTS: GeoWriteCounts = {
  written: 0,
  quarantined: 0,
  rejected: 0,
};

export interface GeoEventBatcher {
  enqueue: (event: GeoTrafficEventRow) => boolean;
  /**
   * Writes the organization's buffered events within about a second instead
   * of at the next window, for organizations with an open live view.
   */
  expedite: (organizationId: string) => void;
  flush: () => Promise<void>;
  /** Stops the timers and writes whatever is still buffered or in flight. */
  stop: () => Promise<void>;
  size: () => number;
}

/** A write that may succeed if tried again later. */
class RetryableWriteError extends Error {}

// Tinybird rejected the payload itself; resending it unchanged never works.
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
 * Organizations someone is watching live are expedited: their events are
 * written within about a second, so live views only cost active minutes
 * while they are open.
 *
 * Every buffered event was already acknowledged, so none is dropped on a
 * retryable failure: rows go back to the front of the buffer, which may then
 * exceed its bound. The bound only makes `enqueue` refuse new events, which
 * the caller writes directly instead.
 */
export function createGeoEventBatcher(
  options: GeoEventBatcherOptions
): GeoEventBatcher {
  const {
    intervalMs,
    maxBufferedEvents = GEO_INGEST_MAX_BUFFERED_EVENTS,
    maxRowsPerWrite = GEO_INGEST_FLUSH_MAX_ROWS,
    write = ingestGeoTrafficEvents,
    onWritten,
    now = Date.now,
    liveFlushDelayMs = GEO_INGEST_LIVE_FLUSH_DELAY_MS,
    liveRetryDelayMs = GEO_INGEST_LIVE_RETRY_DELAY_MS,
  } = options;

  let buffer: GeoTrafficEventRow[] = [];
  let windowFlush: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const liveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const liveAttempts = new Map<string, number>();
  const liveWrites = new Set<Promise<boolean>>();

  function notifyWritten(rows: GeoTrafficEventRow[]) {
    try {
      onWritten?.(rows);
    } catch (error) {
      console.error("[geo-ingest] Write listener failed", error);
    }
  }

  /**
   * Writes one chunk. A rejected payload is split in halves until the rows
   * Tinybird refuses are isolated, so one bad row (or an oversized chunk)
   * never takes valid events down with it. On a retryable failure the rows
   * not yet accepted come back as `pending`, never ones already written.
   */
  async function writeChunk(
    chunk: GeoTrafficEventRow[],
    context: Record<string, unknown>
  ): Promise<GeoChunkResult> {
    try {
      const result = await withTimeout(
        write(chunk),
        GEO_INGEST_FLUSH_TIMEOUT_MS
      );
      if (!result) {
        throw new RetryableWriteError("Tinybird is not configured");
      }
      notifyWritten(chunk);
      return {
        written: result.successful_rows,
        quarantined: result.quarantined_rows,
        rejected: 0,
        pending: [],
      };
    } catch (error) {
      if (isRetryable(error)) {
        return { ...EMPTY_COUNTS, pending: chunk, error };
      }
      if (chunk.length === 1) {
        geoLog.error({
          event: "geo.ingest.flush",
          outcome: "rejected",
          rows: 1,
          organizationId: chunk[0]?.organization_id,
          errorMessage: errorMessage(error),
          ...context,
        });
        return { ...EMPTY_COUNTS, rejected: 1, pending: [] };
      }
      const middle = Math.ceil(chunk.length / 2);
      const right = chunk.slice(middle);
      const left = await writeChunk(chunk.slice(0, middle), context);
      if (left.pending.length > 0) {
        return { ...left, pending: [...left.pending, ...right] };
      }
      const rest = await writeChunk(right, context);
      return {
        written: left.written + rest.written,
        quarantined: left.quarantined + rest.quarantined,
        rejected: left.rejected + rest.rejected,
        pending: rest.pending,
        error: rest.error,
      };
    }
  }

  /** Resolves to false when a retryable failure put rows back in the buffer. */
  async function writeAll(
    rows: GeoTrafficEventRow[],
    trigger: GeoFlushTrigger
  ): Promise<boolean> {
    const startedAt = performance.now();
    const context = {
      trigger,
      runtime: getGeoIngestRuntime(),
      region: getGeoIngestRegion(),
    };
    const totals: GeoWriteCounts = { ...EMPTY_COUNTS };
    for (let start = 0; start < rows.length; start += maxRowsPerWrite) {
      const end = start + maxRowsPerWrite;
      const result = await writeChunk(rows.slice(start, end), context);
      totals.written += result.written;
      totals.quarantined += result.quarantined;
      totals.rejected += result.rejected;
      if (result.pending.length > 0) {
        // At-least-once: a timed-out write may still land, so a retry can
        // duplicate those rows; losing acknowledged ones is the worse
        // outcome. Rows that arrived during the write sit behind them.
        buffer = [...result.pending, ...rows.slice(end), ...buffer];
        geoLog.error({
          event: "geo.ingest.flush",
          outcome: "failed",
          rows: rows.length,
          ...totals,
          retrying: buffer.length,
          errorMessage: errorMessage(result.error),
          durationMs: Math.round(performance.now() - startedAt),
          ...context,
        });
        return false;
      }
    }
    const fields = {
      event: "geo.ingest.flush",
      rows: rows.length,
      ...totals,
      durationMs: Math.round(performance.now() - startedAt),
      ...context,
    } as const;
    // Quarantined or rejected rows failed Tinybird's checks and would fail
    // again, so they are reported instead of retried.
    if (totals.quarantined > 0 || totals.rejected > 0) {
      geoLog.error({ ...fields, outcome: "partial" });
    } else {
      geoLog.info({ ...fields, outcome: "written" });
    }
    return true;
  }

  function flush(trigger: GeoFlushTrigger = "window"): Promise<void> {
    if (windowFlush) {
      return windowFlush;
    }
    if (buffer.length === 0) {
      return Promise.resolve();
    }
    const rows = buffer;
    buffer = [];
    windowFlush = writeAll(rows, trigger)
      .then(() => undefined)
      .finally(() => {
        windowFlush = null;
      });
    return windowFlush;
  }

  function scheduleLiveFlush(organizationId: string, delayMs: number) {
    if (stopped || liveTimers.has(organizationId)) {
      return;
    }
    liveTimers.set(
      organizationId,
      setTimeout(() => {
        liveTimers.delete(organizationId);
        flushOrganization(organizationId);
      }, delayMs)
    );
  }

  function flushOrganization(organizationId: string) {
    const rows: GeoTrafficEventRow[] = [];
    const rest: GeoTrafficEventRow[] = [];
    for (const row of buffer) {
      (row.organization_id === organizationId ? rows : rest).push(row);
    }
    if (rows.length === 0) {
      liveAttempts.delete(organizationId);
      return;
    }
    buffer = rest;
    const writing = writeAll(rows, "live");
    liveWrites.add(writing);
    writing
      .then((written) => {
        // A transient failure must not leave an open live view waiting for
        // the next window; retry a few times before falling back to it.
        const attempts = written ? 0 : (liveAttempts.get(organizationId) ?? 0);
        if (written || attempts >= GEO_INGEST_LIVE_MAX_RETRIES) {
          liveAttempts.delete(organizationId);
          return;
        }
        liveAttempts.set(organizationId, attempts + 1);
        scheduleLiveFlush(organizationId, liveRetryDelayMs);
      })
      .finally(() => liveWrites.delete(writing));
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
    expedite(organizationId) {
      // One pending write per organization absorbs a burst of requests.
      scheduleLiveFlush(organizationId, liveFlushDelayMs);
    },
    flush: () => flush(),
    async stop() {
      stopped = true;
      clearTimeout(timer);
      for (const liveTimer of liveTimers.values()) {
        clearTimeout(liveTimer);
      }
      liveTimers.clear();
      // Live writes hold rows outside the buffer; a failed one puts them
      // back, so the final flush below covers it.
      await Promise.all([windowFlush, ...liveWrites]);
      await flush("shutdown");
    },
    size: () => buffer.length,
  };
}
