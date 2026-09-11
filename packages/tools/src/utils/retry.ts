import { Duration, Effect, Schedule } from "effect";

import {
  RETRYABLE_DATABASE_ERROR_CODES,
  RETRYABLE_HTTP_STATUS_CODES,
  RETRYABLE_NETWORK_ERROR_CODES,
  TRANSIENT_RETRY_BASE_DELAY_MS,
  TRANSIENT_RETRY_MAX_ATTEMPTS,
  TRANSIENT_RETRY_MAX_DELAY_MS,
} from "../constants/retry";
import { retryErrorSchema, ToolOperationError } from "../schemas/retry";
import type { RetryOperation, RetryOptions } from "../types/retry";

export function isRetryableHttpStatus(status: number) {
  return RETRYABLE_HTTP_STATUS_CODES.has(status);
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof ToolOperationError) {
    return error.retryable;
  }

  const parsedError = retryErrorSchema.safeParse(error);
  if (parsedError.success) {
    if (
      parsedError.data.status !== undefined &&
      isRetryableHttpStatus(parsedError.data.status)
    ) {
      return true;
    }
    if (
      parsedError.data.code !== undefined &&
      (RETRYABLE_NETWORK_ERROR_CODES.has(parsedError.data.code) ||
        RETRYABLE_DATABASE_ERROR_CODES.has(parsedError.data.code))
    ) {
      return true;
    }
  }

  return error instanceof TypeError;
}

function parseRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  const rateLimitReset = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(rateLimitReset) && rateLimitReset > 0) {
    return Math.max(0, rateLimitReset * 1000 - Date.now());
  }

  return undefined;
}

function isRetryableResponse(response: Response) {
  if (isRetryableHttpStatus(response.status)) {
    return true;
  }

  return (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  );
}

function createRetrySchedule(
  operationName: string,
  maxAttempts: number,
  baseDelayMs: number,
  maxDelayMs: number
) {
  const exponentialSchedule: Schedule.Schedule<
    Duration.Duration,
    ToolOperationError
  > = Schedule.exponential(Duration.millis(baseDelayMs)).pipe(
    Schedule.jittered
  );

  return Schedule.passthrough(exponentialSchedule).pipe(
    Schedule.modifyDelay(({ input, duration }) =>
      Effect.succeed(
        Duration.millis(
          Math.max(
            Math.min(Duration.toMillis(duration), maxDelayMs),
            input.retryAfterMs ?? 0
          )
        )
      )
    ),
    Schedule.upTo({ times: Math.max(0, maxAttempts - 1) }),
    // Surface long provider cooldowns instead of blocking the caller or retrying early.
    Schedule.while(({ input }) =>
      Effect.succeed(input.retryable && (input.retryAfterMs ?? 0) <= maxDelayMs)
    ),
    Schedule.tap(({ attempt, duration }) =>
      Effect.logWarning(
        `[retry] ${operationName} failed transiently; retrying attempt ${attempt + 1}/${maxAttempts} in ${Math.round(Duration.toMillis(duration))}ms`
      )
    )
  );
}

export function retryTransientEffect<T>(
  operation: Effect.Effect<T, ToolOperationError>,
  options: RetryOptions
): Effect.Effect<T, ToolOperationError> {
  const maxAttempts = options.maxAttempts ?? TRANSIENT_RETRY_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? TRANSIENT_RETRY_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? TRANSIENT_RETRY_MAX_DELAY_MS;
  const retrySchedule = createRetrySchedule(
    options.operationName,
    maxAttempts,
    baseDelayMs,
    maxDelayMs
  );

  return Effect.retry(operation, retrySchedule);
}

export function withTransientRetryEffect<T>(
  operation: RetryOperation<T>,
  options: RetryOptions
): Effect.Effect<T, ToolOperationError> {
  const shouldRetry = options.shouldRetry ?? isTransientError;
  const attempt = Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      cause instanceof ToolOperationError
        ? cause
        : new ToolOperationError({
            cause,
            operationName: options.operationName,
            retryable: shouldRetry(cause),
          }),
  });

  return retryTransientEffect(attempt, options);
}

export function runToolOperation<T>(
  operation: Effect.Effect<T, ToolOperationError>
): Promise<T> {
  return operation.pipe(
    Effect.catchTag("ToolOperationError", (error) => Effect.fail(error.cause)),
    Effect.runPromise
  );
}

export function withTransientRetry<T>(
  operation: RetryOperation<T>,
  options: RetryOptions
): Promise<T> {
  return runToolOperation(withTransientRetryEffect(operation, options));
}

export function fetchWithTransientRetryEffect(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  operationName: string
) {
  return withTransientRetryEffect(
    async (effectSignal) => {
      const signal = init?.signal
        ? AbortSignal.any([effectSignal, init.signal])
        : effectSignal;
      const response = await fetch(input, { ...init, signal });
      if (!isRetryableResponse(response)) {
        return response;
      }

      const retryAfterMs = parseRetryAfterMs(response);
      await response.body?.cancel();
      throw new ToolOperationError({
        cause: new Error(
          `${operationName} failed with retryable status ${response.status}`
        ),
        operationName,
        retryable: true,
        status: response.status,
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      });
    },
    { operationName }
  );
}

export function fetchWithTransientRetry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  operationName: string
) {
  return runToolOperation(
    fetchWithTransientRetryEffect(input, init, operationName)
  );
}
