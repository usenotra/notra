import { flushGeoLog } from "@notra/ai/evlog";

import {
  INGEST_DEFAULT_PORT,
  INGEST_DRAIN_TIMEOUT_MS,
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

async function shutdown() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const drained = await Promise.race([
    drain().then(() => true),
    new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), INGEST_DRAIN_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
  if (!drained) {
    console.error(
      `[geo-ingest] Drain exceeded ${INGEST_DRAIN_TIMEOUT_MS}ms, closing connections`
    );
    server.stop(true);
  }
  await flushGeoLog();
  process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
