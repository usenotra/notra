import { Effect } from "effect";

import {
  SECURITY_ERROR_CODES,
  WORKOS_ELEVATED_ACCESS_HEADER,
  WORKOS_WIDGETS_API_BASE_URL,
  WORKOS_WIDGETS_API_VERSION,
  WORKOS_WIDGETS_TYPE,
} from "@/constants/security";
import { SecurityActionError } from "@/lib/auth/errors";
import type { WidgetsRequestOptions } from "@/types/auth/security";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NO_CONTENT = 204;
const HTTP_UNPROCESSABLE = 422;

class WidgetsHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WidgetsHttpError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string" &&
      payload.message.length > 0
    ) {
      return payload.message;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function toSecurityError(
  cause: unknown,
  options: WidgetsRequestOptions
): SecurityActionError {
  if (cause instanceof WidgetsHttpError) {
    const isAuthFailure =
      cause.status === HTTP_UNAUTHORIZED || cause.status === HTTP_FORBIDDEN;

    if (isAuthFailure && options.requiresElevatedAccess) {
      return new SecurityActionError({
        code: SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED,
        message: "Confirm it's you to continue.",
        cause,
      });
    }

    if (isAuthFailure) {
      return new SecurityActionError({
        code: SECURITY_ERROR_CODES.UNAUTHORIZED,
        message: "Your session has expired. Please sign in again.",
        cause,
      });
    }

    if (
      cause.status === HTTP_BAD_REQUEST ||
      cause.status === HTTP_UNPROCESSABLE
    ) {
      return new SecurityActionError({
        code: SECURITY_ERROR_CODES.INVALID_INPUT,
        message: cause.message,
        cause,
      });
    }

    return new SecurityActionError({
      code: SECURITY_ERROR_CODES.UNKNOWN,
      message: cause.message,
      cause,
    });
  }

  return new SecurityActionError({
    code: SECURITY_ERROR_CODES.UNAVAILABLE,
    message: "Couldn't reach WorkOS. Please try again.",
    cause,
  });
}

export const widgetsRequest = <T>(options: WidgetsRequestOptions) =>
  Effect.tryPromise({
    try: async (): Promise<T> => {
      const url = new URL(options.path, WORKOS_WIDGETS_API_BASE_URL);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${options.accessToken}`,
        "WorkOS-Widgets-Version": WORKOS_WIDGETS_API_VERSION,
        "WorkOS-Widgets-Type": WORKOS_WIDGETS_TYPE,
        "Content-Type": "application/json",
      };
      if (options.elevatedAccessToken) {
        headers[WORKOS_ELEVATED_ACCESS_HEADER] = options.elevatedAccessToken;
      }

      const response = await fetch(url, {
        method: options.method,
        headers,
        cache: "no-store",
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          `WorkOS request failed (${response.status})`
        );
        throw new WidgetsHttpError(response.status, message);
      }

      if (response.status === HTTP_NO_CONTENT) {
        return undefined as T;
      }

      return (await response.json()) as T;
    },
    catch: (cause) => toSecurityError(cause, options),
  });
