import { after } from "next/server";

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
      console.error(failureMessage, error);
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }
}
