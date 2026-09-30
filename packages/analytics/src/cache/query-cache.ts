import type { Redis } from "@upstash/redis";
import { Effect } from "effect";

import {
  EXTERNAL_CACHE_KEY_PREFIX,
  EXTERNAL_CACHE_TTL_SECONDS,
  GLOBAL_SCOPE_ID,
  INITIAL_CACHE_VERSION,
  LIVE_QUERY_CACHE_TTL_SECONDS,
  PURGE_GENERATION_KEY_PREFIX,
  QUERY_CACHE_KEY_PREFIX,
  QUERY_CACHE_TTL_SECONDS,
  VERSION_KEY_PREFIX,
  VERSIONED_CACHE_SCOPES,
} from "../constants/cache";
import type { AnalyticsCacheScope, CachedQueryOptions } from "../types/cache";
import { getAnalyticsRedis } from "./redis";

function versionKey(
  scope: AnalyticsCacheScope,
  organizationId: string | null
): string {
  return `${VERSION_KEY_PREFIX}:${scope}:${organizationId ?? GLOBAL_SCOPE_ID}`;
}

function purgeGenerationKey(
  scope: AnalyticsCacheScope,
  organizationId: string | null
): string {
  return `${PURGE_GENERATION_KEY_PREFIX}:${scope}:${organizationId ?? GLOBAL_SCOPE_ID}`;
}

function queryCacheKey(
  options: CachedQueryOptions<unknown>,
  version: number | "live"
): string {
  // The org segment keys global-scope entries and keeps per-org debugging
  // and eviction possible.
  return `${QUERY_CACHE_KEY_PREFIX}:${options.scope}:${version}:${options.organizationId ?? GLOBAL_SCOPE_ID}:${options.pipe}:${stableParams(options.params)}`;
}

function toJsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? Number(item) : item
    )
  );
}

function stableParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(Object.fromEntries(entries));
}

function readVersion(
  redis: Redis,
  scope: AnalyticsCacheScope,
  organizationId: string | null
): Effect.Effect<number> {
  return Effect.tryPromise(() =>
    redis.get<number>(versionKey(scope, organizationId))
  ).pipe(
    Effect.orElseSucceed(() => null),
    Effect.map((version) => version ?? INITIAL_CACHE_VERSION)
  );
}

export function cachedQuery<TResult>(
  options: CachedQueryOptions<TResult>
): Promise<TResult> {
  const redis = getAnalyticsRedis();
  if (!redis) {
    return options.fetch();
  }
  // Versioned scopes pay one extra round trip for the version so ingest can
  // invalidate on demand. Live scopes expire on a short TTL and carry the
  // org's purge generation inside the entry instead (see liveQuery).
  const program = VERSIONED_CACHE_SCOPES.has(options.scope)
    ? versionedQuery(redis, options)
    : liveQuery(redis, options);
  return Effect.runPromise(program);
}

interface LiveQueryCacheEntry<TResult> {
  generation: number;
  value: TResult;
}

function versionedQuery<TResult>(
  redis: Redis,
  options: CachedQueryOptions<TResult>
): Effect.Effect<TResult, unknown> {
  return Effect.gen(function* () {
    const version = yield* readVersion(
      redis,
      options.scope,
      options.organizationId
    );
    const key = queryCacheKey(options, version);
    const hit = yield* Effect.tryPromise(() => redis.get<TResult>(key)).pipe(
      Effect.orElseSucceed(() => null)
    );
    if (hit !== null) {
      return hit;
    }
    const fresh = yield* Effect.tryPromise(() => options.fetch());
    if (fresh !== null) {
      yield* Effect.tryPromise(() =>
        redis.set(key, toJsonSafe(fresh), { ex: QUERY_CACHE_TTL_SECONDS })
      ).pipe(Effect.ignore);
    }
    return fresh;
  });
}

function liveQuery<TResult>(
  redis: Redis,
  options: CachedQueryOptions<TResult>
): Effect.Effect<TResult, unknown> {
  const key = queryCacheKey(options, "live");
  const generationKey = purgeGenerationKey(
    options.scope,
    options.organizationId
  );
  return Effect.gen(function* () {
    // Entry and purge generation travel in the same round trip. Entries from
    // before this deploy (or from racing pre-purge writers) don't carry the
    // current generation and are treated as misses; they age out within the
    // TTL.
    const [hit, storedGeneration] = yield* Effect.tryPromise(() =>
      redis
        .pipeline()
        .get<LiveQueryCacheEntry<TResult>>(key)
        .get<number>(generationKey)
        .exec()
    ).pipe(
      Effect.orElseSucceed(
        (): [LiveQueryCacheEntry<TResult> | null, number | null] => [null, null]
      )
    );
    const generation = storedGeneration ?? INITIAL_CACHE_VERSION;
    if (hit !== null && hit.generation === generation) {
      return hit.value;
    }
    const fresh = yield* Effect.tryPromise(() => options.fetch());
    if (fresh !== null) {
      // Stamp the entry with the generation read above: if a purge bumps it
      // before this write lands, readers reject the entry, so a racing
      // pre-purge fetch can never make deleted rows readable again.
      yield* Effect.tryPromise(() =>
        redis.set(key, toJsonSafe({ generation, value: fresh }), {
          ex: LIVE_QUERY_CACHE_TTL_SECONDS,
        })
      ).pipe(Effect.ignore);
    }
    return fresh;
  });
}

export function bumpAnalyticsVersions(
  scope: AnalyticsCacheScope,
  organizationIds: ReadonlyArray<string | null>
): Promise<void> {
  const redis = getAnalyticsRedis();
  const keys = [...new Set(organizationIds.map((id) => versionKey(scope, id)))];
  if (!redis || keys.length === 0 || !VERSIONED_CACHE_SCOPES.has(scope)) {
    return Promise.resolve();
  }
  const program = Effect.tryPromise(() => {
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.incr(key);
    }
    return pipeline.exec();
  }).pipe(Effect.ignore);
  return Effect.runPromise(program);
}

// Live scopes carry no version to bump and expire on a short TTL, so purges
// advance a per-org generation instead of scanning for keys. Every cached
// entry is stamped with the generation at write time and only served while
// it matches, which makes the bump O(1) and race-free: an in-flight
// pre-purge fetch writes the old generation and readers reject it after the
// bump. Errors are swallowed — worst case, entries stay readable until they
// expire within LIVE_QUERY_CACHE_TTL_SECONDS.
export function bumpPurgeGeneration(
  scope: AnalyticsCacheScope,
  organizationId: string | null
): Promise<void> {
  const redis = getAnalyticsRedis();
  if (!redis || VERSIONED_CACHE_SCOPES.has(scope)) {
    return Promise.resolve();
  }
  const program = Effect.tryPromise(() =>
    redis.incr(purgeGenerationKey(scope, organizationId))
  ).pipe(Effect.ignore);
  return Effect.runPromise(program);
}

export function cachedExternalFetch<TResult>(
  key: string,
  fetchFresh: () => Promise<TResult>,
  ttlSeconds: number = EXTERNAL_CACHE_TTL_SECONDS
): Promise<TResult> {
  const redis = getAnalyticsRedis();
  if (!redis) {
    return fetchFresh();
  }
  const cacheKey = `${EXTERNAL_CACHE_KEY_PREFIX}:${key}`;
  const program = Effect.gen(function* () {
    const hit = yield* Effect.tryPromise(() =>
      redis.get<TResult>(cacheKey)
    ).pipe(Effect.orElseSucceed(() => null));
    if (hit !== null) {
      return hit;
    }
    const fresh = yield* Effect.tryPromise(() => fetchFresh());
    if (fresh !== null) {
      yield* Effect.tryPromise(() =>
        redis.set(cacheKey, toJsonSafe(fresh), { ex: ttlSeconds })
      ).pipe(Effect.ignore);
    }
    return fresh;
  });
  return Effect.runPromise(program);
}
