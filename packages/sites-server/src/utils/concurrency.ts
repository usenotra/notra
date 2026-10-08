import { Effect } from "effect";

import { runSitesEffect } from "./run-sites-effect";

export const mapWithConcurrencyEffect = Effect.fn("Sites.mapWithConcurrency")(
  function* <T, R, E, Env>(
    items: T[],
    limit: number,
    fn: (item: T) => Effect.Effect<R, E, Env>
  ) {
    if (items.length === 0) {
      const results: R[] = [];
      return results;
    }
    if (Number.isNaN(limit) || limit < 1) {
      return yield* Effect.fail(
        new RangeError("Concurrency limit must be at least 1")
      );
    }
    return yield* Effect.forEach(items, fn, {
      concurrency: Math.min(items.length, Math.floor(limit)),
    });
  }
);

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  return runSitesEffect(
    mapWithConcurrencyEffect(items, limit, (item) =>
      Effect.tryPromise({
        try: () => fn(item),
        catch: (error) => error,
      })
    )
  );
}
