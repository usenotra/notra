import { Effect } from "effect";

/**
 * Run an Effect program at the HTTP boundary.
 *
 * Use `prepare` to convert infrastructure failures into defects via
 * `Effect.die` so Hono's central error handler can respond; remaining typed
 * failures are returned in an `Effect.result` wrapper.
 */
export function runProgram<A, E, EDomain>(
  program: Effect.Effect<A, EDomain | E>,
  prepare: (effect: Effect.Effect<A, EDomain | E>) => Effect.Effect<A, EDomain>
) {
  return Effect.runPromise(Effect.result(prepare(program)));
}
