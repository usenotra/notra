import { after } from "next/server";

import type { TelemetryHost } from "@/types/telemetry";

export function scheduleRequestErrorTelemetry(
  flush: () => Promise<unknown>
): void {
  const task = async () => {
    try {
      await flush();
    } catch (error) {
      console.error("[telemetry] request error flush failed", error);
    }
  };

  try {
    after(task);
  } catch {
    // onRequestError can run outside Next's work store. Use the documented
    // platform request context when available, without awaiting delivery.
    const pending = Promise.resolve().then(task);
    try {
      const host = globalThis as TelemetryHost;
      host[Symbol.for("@next/request-context")]?.get()?.waitUntil?.(pending);
    } catch (error) {
      console.error("[telemetry] request lifetime registration failed", error);
    }
    // Without a platform lifecycle, delivery is best-effort in this process.
  }
}
