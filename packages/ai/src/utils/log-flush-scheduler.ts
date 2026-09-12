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
    try {
      schedule(async () => {
        await preceding;
        scheduled = false;
        const current = flush();
        // Observe errors through the host's callback, but let the next flush
        // run even if this one fails. Keep at most one queued callback.
        active = current.catch(() => {});
        await current;
      });
    } catch (error) {
      scheduled = false;
      throw error;
    }
  };
}
