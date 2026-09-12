import { Effect } from "effect";

/** Keep typed errors intact for existing Promise-based HTTP adapters. */
export async function runServiceEffect<A, E>(effect: Effect.Effect<A, E>) {
  const result = await Effect.runPromise(Effect.result(effect));
  if (result._tag === "Failure") {
    throw result.failure;
  }
  return result.success;
}
