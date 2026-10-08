import { flushGeoLog, geoLog } from "@notra/ai/evlog";
import { logError } from "@notra/ai/utils/server-log";
import { getGeoTrafficFlushIntervalMs } from "@notra/analytics/utils/geo-flush-interval";
import { db } from "@notra/db/drizzle";
import { createGeoEventBatcher } from "@notra/geo-core/ingest/batcher";
import { announceGeoTrafficRows } from "@notra/geo-core/ingest/live";
import {
  getGeoIngestRegion,
  getGeoIngestRuntime,
} from "@notra/geo-core/utils/ingest-runtime";

import {
  INGEST_DEFAULT_PORT,
  INGEST_DATABASE_CLOSE_TIMEOUT_MS,
  INGEST_DRAIN_TIMEOUT_MS,
  INGEST_EVENTS_FLUSH_TIMEOUT_MS,
  INGEST_FLUSH_TIMEOUT_MS,
  INGEST_MAX_BODY_BYTES,
  INGEST_RUNTIME_LOG_INTERVAL_MS,
} from "./constants/server";
import { createIngestApp } from "./http";
import { missingIngestEnvironment } from "./utils/config";
import { retainIngestDatabaseConnections } from "./utils/retain-database-connections";

const pending = new Set<Promise<void>>();
const active = new Set<Promise<Response>>();
const missing = missingIngestEnvironment();
if (missing.length > 0) {
  console.warn(`[geo-ingest] Missing configuration: ${missing.join(", ")}`);
}

const databasePool = process.env.DATABASE_URL ? db.$client : null;
if (databasePool) {
  retainIngestDatabaseConnections(databasePool);
}

const flushIntervalMs = getGeoTrafficFlushIntervalMs();
const batcher =
  flushIntervalMs > 0
    ? createGeoEventBatcher({
        intervalMs: flushIntervalMs,
        onWritten: announceGeoTrafficRows,
      })
    : null;

const app = createIngestApp((task) => {
  const promise = task()
    .catch((error) => {
      logError("[geo-ingest] Background task failed", error);
    })
    .finally(() => pending.delete(promise));
  pending.add(promise);
}, batcher ?? undefined);

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: process.env.PORT ?? INGEST_DEFAULT_PORT,
  maxRequestBodySize: INGEST_MAX_BODY_BYTES,
  idleTimeout: 60,
  fetch(request) {
    const response = Promise.resolve(app.fetch(request));
    active.add(response);
    return response.finally(() => active.delete(response));
  },
});

console.info(`[geo-ingest] Listening on port ${server.port}`);

const runtimeLogTimer = setInterval(() => {
  const memory = process.memoryUsage();
  geoLog.info({
    event: "geo.ingest.runtime",
    runtime: getGeoIngestRuntime(),
    region: getGeoIngestRegion(),
    replicaId: process.env.RAILWAY_REPLICA_ID,
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
    uptimeSeconds: Math.round(process.uptime()),
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    activeRequests: active.size,
    pendingTasks: pending.size,
    bufferedEvents: batcher?.size() ?? 0,
    databaseConnections: databasePool?.totalCount ?? 0,
    databaseIdleConnections: databasePool?.idleCount ?? 0,
    databaseWaitingRequests: databasePool?.waitingCount ?? 0,
  });
}, INGEST_RUNTIME_LOG_INTERVAL_MS);
runtimeLogTimer.unref();

async function drain() {
  const stopped = server.stop();
  await Promise.allSettled(active);
  await stopped;
  await Promise.allSettled(pending);
}

async function withDeadline(
  task: () => Promise<void>,
  timeoutMs: number
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task().then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.error("[geo-ingest] Shutdown step failed", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearInterval(runtimeLogTimer);
  if (!(await withDeadline(drain, INGEST_DRAIN_TIMEOUT_MS))) {
    console.error(
      `[geo-ingest] Drain exceeded ${INGEST_DRAIN_TIMEOUT_MS}ms, closing connections`
    );
    server.stop(true);
  }
  if (batcher) {
    const flushed = await withDeadline(
      () => batcher.stop(),
      INGEST_EVENTS_FLUSH_TIMEOUT_MS
    );
    if (!flushed || batcher.size() > 0) {
      console.error(
        `[geo-ingest] Buffered events not written before exit (${batcher.size()} left in buffer)`
      );
    }
  }
  if (
    databasePool &&
    !(await withDeadline(
      () => databasePool.end(),
      INGEST_DATABASE_CLOSE_TIMEOUT_MS
    ))
  ) {
    console.error(
      `[geo-ingest] Database pool did not close within ${INGEST_DATABASE_CLOSE_TIMEOUT_MS}ms`
    );
  }
  if (!(await withDeadline(flushGeoLog, INGEST_FLUSH_TIMEOUT_MS))) {
    console.error(
      `[geo-ingest] Log flush did not finish within ${INGEST_FLUSH_TIMEOUT_MS}ms`
    );
  }
  process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
