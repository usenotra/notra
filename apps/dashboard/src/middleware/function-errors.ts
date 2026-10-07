import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const GENERIC_SERVER_ERROR = "Internal server error";

/**
 * Server functions answer thrown errors with a 500 response instead of letting
 * them reach the Nitro middleware, so report them here like Next's
 * onRequestError did for server actions and server components.
 *
 * TanStack serializes the error's message into that response and into SSR
 * HTML. In production that exposed raw database errors (SQL, hosts), which
 * Next hid behind a generic message, so production rethrows a generic error.
 */
export const functionErrorTelemetry = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (isRedirect(error) || isNotFound(error)) {
      throw error;
    }
    const { onRequestError } = await import("@/instrumentation");
    await onRequestError(error, getRequest()).catch((captureError) => {
      console.error(
        "[telemetry] server function error capture failed",
        captureError
      );
    });
    throw import.meta.env.PROD ? new Error(GENERIC_SERVER_ERROR) : error;
  }
});
