import { Effect } from "effect";

export async function runGitHubEffect<A, E>(program: Effect.Effect<A, E>) {
  const result = await Effect.runPromise(Effect.result(program));
  if (result._tag === "Failure") {
    throw result.failure;
  }
  return result.success;
}
