import {
  flushLogs,
  geoLog,
  setLogFlushScheduler,
  withEvlog,
} from "@notra/ai/evlog";
import { ManagedRuntime } from "effect";

import {
  RUNNER_DEFAULT_PORT,
  RUNNER_DRAIN_TIMEOUT_MS,
  RUNNER_IDLE_TIMEOUT_SECONDS,
  RUNNER_LOCAL_SECRET,
  RUNNER_LOG_FLUSH_TIMEOUT_MS,
  RUNNER_MAX_REQUEST_BODY_BYTES,
} from "./constants/runner";
import { createApp } from "./http/routes";
import { RunQueue, runQueueLive } from "./services/run-queue";
import { withShutdownDeadline } from "./utils/shutdown";

setLogFlushScheduler((flush) => {
  setTimeout(() => {
    void flush().catch(() => undefined);
  }, 0);
});

const runtime = ManagedRuntime.make(runQueueLive);
const queue = await runtime.runPromise(RunQueue);
const development = process.env.NODE_ENV === "development";
const app = createApp(
  queue,
  process.env.GEO_RUNNER_SECRET ??
    (development ? RUNNER_LOCAL_SECRET : undefined)
);
const port = process.env.PORT ?? RUNNER_DEFAULT_PORT;
let accepting = true;
const requests = new Set<Promise<Response>>();

geoLog.info({ event: "geo.runner.starting", port });
await flushLogs().catch(() => undefined);

// Railway sends SIGTERM on redeploy. Stop accepting, clear the local backlog,
// then dispose. Dispose interrupts in-flight scans, which mark
// themselves failed and release their billing reservation.
async function stopRunner(signal: "SIGTERM" | "SIGINT") {
  if (!accepting) {
    return;
  }
  accepting = false;
  geoLog.info({ event: "geo.runner.stopping", signal });
  const drained = await withShutdownDeadline(async () => {
    const stopped = server.stop();
    await Promise.allSettled(requests);
    await stopped;
    await runtime.runPromise(queue.drain());
    await runtime.dispose();
  }, RUNNER_DRAIN_TIMEOUT_MS);
  if (!drained) {
    server.stop(true);
    geoLog.error({ event: "geo.runner.drain_failed" });
  }
  await withShutdownDeadline(flushLogs, RUNNER_LOG_FLUSH_TIMEOUT_MS);
  process.exit(0);
}

process.once("SIGTERM", () => stopRunner("SIGTERM"));
process.once("SIGINT", () => stopRunner("SIGINT"));

const server = Bun.serve({
  hostname: development ? "127.0.0.1" : undefined,
  port,
  idleTimeout: RUNNER_IDLE_TIMEOUT_SECONDS,
  maxRequestBodySize: RUNNER_MAX_REQUEST_BODY_BYTES,
  fetch: withEvlog((request: Request) => {
    if (!accepting && new URL(request.url).pathname !== "/health") {
      return Response.json(
        {
          error: {
            code: "shutting_down",
            message: "Runner is shutting down",
          },
        },
        { status: 503 }
      );
    }
    const response = Promise.resolve(app.fetch(request));
    requests.add(response);
    // Return the `finally` promise. The original rejection is handled by
    // `finally`, so discarding its promise would be an unhandled rejection.
    return response.finally(() => {
      requests.delete(response);
    });
  }),
});
