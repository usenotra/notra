import type { LogFlushScheduler } from "@notra/ai/types/operational-log";

export function createLogFlushScheduler(
  schedule: LogFlushScheduler
): LogFlushScheduler {
  let active = Promise.resolve();
  let scheduled = false;

  return (flush) => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    const preceding = active;
    const run = async () => {
      await preceding;
      scheduled = false;
      const current = flush();
      // Observe errors through the host's callback, but let the next flush
      // run even if this one fails. Keep at most one queued callback.
      active = current.catch(() => {});
      await current;
    };
    try {
      schedule(run);
    } catch {
      // The host hook (e.g. Next's after()) throws outside a request scope —
      // background jobs, or when a streamed response finishes after the route
      // returned. Flush on a macrotask instead so buffered events still ship
      // while the runtime is alive.
      setTimeout(() => {
        run().catch(() => {});
      }, 0);
    }
  };
}
