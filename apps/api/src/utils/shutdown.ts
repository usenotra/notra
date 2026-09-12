import { API_SHUTDOWN_TIMEOUTS } from "../constants/shutdown";
import type { ApiServerControl, ApiShutdownTimeouts } from "../types/shutdown";

async function waitForPhase(
  operation: () => Promise<unknown>,
  timeoutMs: number,
  phase: string
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const completed = await Promise.race([
      Promise.resolve()
        .then(operation)
        .then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    if (!completed) {
      console.error(`[shutdown] ${phase} exceeded ${timeoutMs}ms`);
    }
    return completed;
  } catch (error) {
    console.error(`[shutdown] ${phase} failed`, error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function createApiShutdown(
  flushTelemetry: () => Promise<unknown>,
  timeouts: ApiShutdownTimeouts = API_SHUTDOWN_TIMEOUTS
) {
  let server: ApiServerControl | undefined;
  let shutdownPromise: Promise<void> | undefined;
  const requests = new Set<Promise<Response>>();

  async function shutdown() {
    const activeServer = server;
    const drained = await waitForPhase(
      () =>
        Promise.all([
          activeServer?.stop(),
          // Disconnected clients can leave application handlers running after
          // the transport closes. Wait for those handler promises as well.
          Promise.allSettled([...requests]),
        ]),
      timeouts.requestsMs,
      "active requests"
    );
    if (!drained && activeServer) {
      // Force-close sockets at the deadline. A handler that ignores aborts
      // must not prevent the telemetry phase and eventual process exit.
      void Promise.resolve()
        .then(() => activeServer.stop(true))
        .catch((error) => {
          console.error("[shutdown] closing connections failed", error);
        });
    }
    await waitForPhase(flushTelemetry, timeouts.telemetryMs, "telemetry flush");
  }

  return {
    attachServer(value: ApiServerControl) {
      server = value;
    },
    handleRequest(
      operation: () => Response | Promise<Response>
    ): Promise<Response> {
      if (shutdownPromise) {
        return Promise.resolve(
          new Response("Service unavailable", {
            status: 503,
            headers: { Connection: "close" },
          })
        );
      }
      const request = Promise.resolve().then(operation);
      requests.add(request);
      return request.finally(() => requests.delete(request));
    },
    shutdown(): Promise<void> {
      shutdownPromise ??= shutdown();
      return shutdownPromise;
    },
  };
}
