import { Effect } from "effect";

import { internalServerError } from "@/lib/orpc/utils/errors";

export async function runOrpcEffect<A, E>(
  effect: Effect.Effect<A, E>,
  toOrpcError: (failure: E) => Error | Promise<Error>
): Promise<A> {
  const outcome = await Effect.runPromise(Effect.result(effect));

  if (outcome._tag === "Failure") {
    throw await toOrpcError(outcome.failure);
  }

  return outcome.success;
}

export function toUnexpectedError(cause: unknown, message: string): Error {
  if (cause instanceof Error) {
    return cause;
  }
  return internalServerError(message, cause);
}
