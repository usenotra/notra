import { flushGeoLog } from "@notra/ai/evlog";

import {
  INGEST_DEFAULT_PORT,
  INGEST_DRAIN_TIMEOUT_MS,
  INGEST_FLUSH_TIMEOUT_MS,
  INGEST_MAX_BODY_BYTES,
} from "./constants/server";
import { createIngestApp } from "./http";
import { missingIngestEnvironment } from "./utils/config";

const pending = new Set<Promise<void>>();
const active = new Set<Promise<Response>>();
const missing = missingIngestEnvironment();
if (missing.length > 0) {
  console.warn(`[geo-ingest] Missing configuration: ${missing.join(", ")}`);
}

const app = createIngestApp((task) => {
  const promise = task()
    .catch((error) => {
      console.error("[geo-ingest] Background task failed", error);
    })
    .finally(() => pending.delete(promise));
  pending.add(promise);
});

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

async function shutdown() {
  if (!(await withDeadline(drain, INGEST_DRAIN_TIMEOUT_MS))) {
    console.error(
      `[geo-ingest] Drain exceeded ${INGEST_DRAIN_TIMEOUT_MS}ms, closing connections`
    );
    server.stop(true);
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
