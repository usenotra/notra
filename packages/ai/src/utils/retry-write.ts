import { Effect, Result, Schedule } from "effect";

const DEFAULT_ATTEMPTS = 3;

/**
 * Retries a database write that follows an action on another system (a GitHub
 * commit, an opened pull request). That action cannot be rolled back, so a
 * transient failure here should not be what leaves the two sides out of step.
 */
export async function retryWrite<T>(
  run: () => Promise<T>,
  attempts = DEFAULT_ATTEMPTS
): Promise<T> {
  if (
    !(Number.isFinite(attempts) && Number.isInteger(attempts) && attempts >= 1)
  ) {
    throw new RangeError("attempts must be a positive finite integer");
  }
  const result = await Effect.runPromise(
    Effect.result(
      Effect.tryPromise({
        try: run,
        catch: (error) => error,
      }).pipe(Effect.retry(Schedule.recurs(attempts - 1)))
    )
  );
  if (Result.isFailure(result)) {
    throw result.failure;
  }
  return result.success;
}
