import { logError } from "@notra/ai/utils/server-log";

import { afterResponse } from "@/lib/framework/after-response";

/**
 * Runs best-effort work after the response is sent, so it never fails or
 * slows down the request. Outside a request (CLI, workflows) there is no
 * lifetime to extend and the task starts right away. Never throws.
 */
export function runAfterResponse(
  failureMessage: string,
  task: () => unknown
): void {
  const run = async () => {
    try {
      await task();
    } catch (error) {
      logError(failureMessage, error);
    }
  };

  try {
    afterResponse(run);
  } catch {
    void run();
  }
}
