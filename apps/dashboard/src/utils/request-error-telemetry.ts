import { afterResponse } from "@/lib/framework/after-response";

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
    afterResponse(task);
  } catch {
    void Promise.resolve().then(task);
  }
}
