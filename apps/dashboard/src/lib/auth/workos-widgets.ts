import { Effect } from "effect";
import type * as z from "zod";

import { ACTION_ERROR_CODES } from "@/constants/actions";
import {
  SECURITY_ERROR_CODES,
  WORKOS_ELEVATED_ACCESS_HEADER,
  WORKOS_WIDGETS_API_BASE_URL,
  WORKOS_WIDGETS_API_VERSION,
  WORKOS_WIDGETS_TYPE,
} from "@/constants/security";
import { ActionFailure } from "@/lib/actions/errors";
import type { WidgetsRequestOptions } from "@/types/auth/security";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_UNPROCESSABLE = 422;

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

function httpFailure(status: number, message: string, elevated: boolean) {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return elevated
      ? new ActionFailure({
          code: SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED,
          message: "Confirm it's you to continue.",
        })
      : new ActionFailure({
          code: ACTION_ERROR_CODES.UNAUTHORIZED,
          message: "Your session has expired. Please sign in again.",
        });
  }
  if (status === HTTP_BAD_REQUEST || status === HTTP_UNPROCESSABLE) {
    return new ActionFailure({
      code: ACTION_ERROR_CODES.INVALID_INPUT,
      message,
    });
  }
  return new ActionFailure({ message });
}

/**
 * Calls the WorkOS Widgets API with the session access token. Responses are
 * parsed with `schema`, so callers get a typed value or a clean failure.
 */
export const widgetsRequest = <Schema extends z.ZodType>(
  options: WidgetsRequestOptions<Schema>
): Effect.Effect<z.output<Schema>, ActionFailure> =>
  Effect.gen(function* () {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${options.accessToken}`,
      "WorkOS-Widgets-Version": WORKOS_WIDGETS_API_VERSION,
      "WorkOS-Widgets-Type": WORKOS_WIDGETS_TYPE,
      "Content-Type": "application/json",
    };
    if (options.elevatedAccessToken) {
      headers[WORKOS_ELEVATED_ACCESS_HEADER] = options.elevatedAccessToken;
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(new URL(options.path, WORKOS_WIDGETS_API_BASE_URL), {
          method: options.method,
          headers,
          cache: "no-store",
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
        }),
      catch: (cause) =>
        new ActionFailure({
          code: SECURITY_ERROR_CODES.UNAVAILABLE,
          message: "Couldn't reach WorkOS. Please try again.",
          cause,
        }),
    });

    if (!response.ok) {
      const message = yield* Effect.promise(() =>
        readErrorMessage(response, `WorkOS request failed (${response.status})`)
      );
      return yield* Effect.fail(
        httpFailure(
          response.status,
          message,
          options.elevatedAccessToken !== undefined
        )
      );
    }

    const payload = yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (cause) =>
        new ActionFailure({
          message: "WorkOS returned an unreadable response.",
          cause,
        }),
    });
    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) {
      return yield* Effect.fail(
        new ActionFailure({
          message: "WorkOS returned an unexpected response.",
          cause: parsed.error,
        })
      );
    }
    return parsed.data as z.output<Schema>;
  });
