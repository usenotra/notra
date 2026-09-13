import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped memo for read-only lookups that many GEO procedures repeat
 * within one HTTP request (a batched oRPC call runs 5–10 of them in parallel,
 * each resolving the same project scope). Outside `runWithGeoRequestMemo` every
 * lookup runs uncached, so workflows, crons and tests keep their behaviour.
 */
const storage = new AsyncLocalStorage<Map<string, Promise<unknown>>>();

export function runWithGeoRequestMemo<T>(fn: () => T): T {
  return storage.run(new Map(), fn);
}

export function memoizeGeoRequest<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const memo = storage.getStore();
  if (!memo) {
    return load();
  }

  const cached = memo.get(key) as Promise<T> | undefined;
  if (cached) {
    return cached;
  }

  const pending = load();
  memo.set(key, pending);
  // A failed lookup must not poison later procedures in the same batch.
  pending.catch(() => memo.delete(key));
  return pending;
}
