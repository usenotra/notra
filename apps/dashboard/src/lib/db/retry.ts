import { Effect, Schedule } from "effect";

import {
  TRANSIENT_DB_CODES,
  TRANSIENT_DB_MESSAGES,
  TRANSIENT_DB_RETRY_DELAYS_MS,
} from "@/constants/db-retry";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown): string | undefined {
  if (!(error && typeof error === "object")) {
    return;
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : undefined;
}

function getErrorCause(error: unknown): unknown {
  if (!(error && typeof error === "object")) {
    return;
  }

  return (error as { cause?: unknown }).cause;
}

function isTransientDbError(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current) {
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);

    const message = getErrorMessage(current);
    if (TRANSIENT_DB_MESSAGES.some((value) => message.includes(value))) {
      return true;
    }

    const code = getErrorCode(current);
    if (code && TRANSIENT_DB_CODES.has(code)) {
      return true;
    }

    current = getErrorCause(current);
  }

  return false;
}

const retryTransientDbEffect = Effect.fn("db.retryTransient")(function* <T>(
  operation: () => Promise<T>
) {
  return yield* Effect.tryPromise({
    try: operation,
    catch: (cause) => cause,
  }).pipe(
    Effect.retry({
      schedule: Schedule.recurs(TRANSIENT_DB_RETRY_DELAYS_MS.length).pipe(
        Schedule.modifyDelay(({ attempt }) =>
          Effect.succeed(TRANSIENT_DB_RETRY_DELAYS_MS[attempt - 1] ?? 0)
        )
      ),
      while: isTransientDbError,
    })
  );
});

export function retryTransientDbError<T>(
  operation: () => Promise<T>
): Promise<T> {
  return Effect.runPromise(retryTransientDbEffect(operation));
}
