import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server functions answer thrown errors with a 500 response instead of letting
 * them reach the Nitro middleware, so report them here like Next's
 * onRequestError did for server actions and server components.
 */
export const functionErrorTelemetry = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (!(isRedirect(error) || isNotFound(error))) {
      const { onRequestError } = await import("@/instrumentation");
      await onRequestError(error, getRequest()).catch((captureError) => {
        console.error(
          "[telemetry] server function error capture failed",
          captureError
        );
      });
    }
    throw error;
  }
});
