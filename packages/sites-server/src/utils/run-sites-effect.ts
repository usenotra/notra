import { Cause, Effect, Exit } from "effect";

export async function runSitesEffect<A, E>(program: Effect.Effect<A, E>) {
  const result = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(result)) {
    return result.value;
  }
  if (result.cause.reasons.length === 1) {
    const reason = result.cause.reasons[0];
    if (reason?._tag === "Fail") {
      throw reason.error;
    }
    if (reason?._tag === "Die") {
      throw reason.defect;
    }
  }
  throw Cause.squash(result.cause);
}
