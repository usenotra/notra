import { isDemoMode } from "@notra/utils/demo-mode";
import { ORPCError } from "@orpc/server";

import { DEMO_DISABLED_MESSAGE } from "@/constants/demo";

export function badRequest(message: string, data?: unknown) {
  return new ORPCError("BAD_REQUEST", {
    message,
    data,
  });
}

export function unauthorized(message = "Unauthorized", data?: unknown) {
  return new ORPCError("UNAUTHORIZED", {
    message,
    data,
  });
}

export function forbidden(message = "Forbidden", data?: unknown) {
  return new ORPCError("FORBIDDEN", {
    message,
    data,
  });
}

/** Blocks actions the public demo can't offer (real uploads, keys, accounts). */
export function assertNotDemo() {
  if (isDemoMode()) {
    throw forbidden(DEMO_DISABLED_MESSAGE);
  }
}

export function notFound(message = "Not Found") {
  return new ORPCError("NOT_FOUND", {
    message,
  });
}

export function conflict(message: string, data?: unknown) {
  return new ORPCError("CONFLICT", {
    message,
    data,
  });
}

export function tooManyRequests(message: string, data?: unknown) {
  return new ORPCError("TOO_MANY_REQUESTS", {
    message,
    data,
  });
}

export function paymentRequired(message: string, data?: unknown) {
  return new ORPCError("PAYMENT_REQUIRED", {
    status: 402,
    message,
    data,
  });
}

export function serviceUnavailable(message: string) {
  return new ORPCError("SERVICE_UNAVAILABLE", {
    message,
  });
}

export function internalServerError(message: string, cause?: unknown) {
  let resolvedCause: Error | undefined;
  if (cause instanceof Error) {
    resolvedCause = cause;
  } else if (cause !== undefined) {
    resolvedCause = new Error(String(cause));
  }

  return new ORPCError("INTERNAL_SERVER_ERROR", {
    cause: resolvedCause,
    message,
  });
}
