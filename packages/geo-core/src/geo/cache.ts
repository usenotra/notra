import { redis } from "@notra/ai/utils/redis";
import { Effect } from "effect";
import type { ZodType } from "zod";

export const readGeoCache = Effect.fn("geo.cache.read")(function* <T>(
  key: string,
  schema: ZodType<T>
) {
  const client = redis;
  if (!client) {
    return null;
  }
  const cached = yield* Effect.promise(() =>
    client.get<unknown>(key).catch(() => null)
  );
  const parsed = schema.safeParse(cached);
  return parsed.success ? parsed.data : null;
});

export const writeGeoCache = Effect.fn("geo.cache.write")(function* (
  key: string,
  value: unknown,
  ttlSeconds: number
) {
  const client = redis;
  if (!client) {
    return;
  }
  yield* Effect.promise(() =>
    client.set(key, value, { ex: ttlSeconds }).catch(() => null)
  );
});

export const deleteGeoCache = Effect.fn("geo.cache.delete")(function* (
  ...keys: string[]
) {
  const client = redis;
  if (client && keys.length > 0) {
    yield* Effect.promise(() => client.del(...keys).catch(() => null));
  }
});
