import { Redis } from "@upstash/redis";
import { Effect } from "effect";

import { RedisUnavailableError } from "@/lib/onboarding/errors";
import type { CompanyLogoResult } from "@/types/onboarding";

const CACHE_KEY_PREFIX = "cache:company-logo:v1";
/** Brand logos effectively never change, so resolved lookups are held for a week. */
const RESOLVED_TTL_SECONDS = 604_800;
/** A brand that is unknown today may be known tomorrow. */
const UNRESOLVED_TTL_SECONDS = 3600;

/**
 * A cache that answers slower than the lookup it protects is worse than no
 * cache, so both round trips are bounded. The read budget is the tighter one:
 * it sits in front of the request, while the write only delays the response of
 * a request that already paid for the live lookup.
 */
const REDIS_READ_TIMEOUT_MS = 300;
const REDIS_WRITE_TIMEOUT_MS = 1000;

interface CompanyLogoCacheKeyInput {
  query: string;
  searchByName: boolean;
}

function createBoundedRedisClient(timeoutMs: number): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!(url && token)) {
    return null;
  }

  // Upstash accepts a signal factory so each REST call gets its own timeout.
  return new Redis({
    url,
    token,
    signal: () => AbortSignal.timeout(timeoutMs),
  });
}

const readRedis = createBoundedRedisClient(REDIS_READ_TIMEOUT_MS);
const writeRedis = createBoundedRedisClient(REDIS_WRITE_TIMEOUT_MS);

function buildCacheKey({ query, searchByName }: CompanyLogoCacheKeyInput) {
  const mode = searchByName ? "name" : "domain";
  return `${CACHE_KEY_PREFIX}:${mode}:${query.trim().toLowerCase()}`;
}

function isCompanyLogoResult(value: unknown): value is CompanyLogoResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompanyLogoResult>;
  const domainValid =
    candidate.domain === null || typeof candidate.domain === "string";
  const urlValid = candidate.url === null || typeof candidate.url === "string";
  return domainValid && urlValid;
}

/**
 * Logged where the fall-through happens so a broken or slow cache is visible,
 * instead of silently costing every caller the live lookup.
 */
function logCacheSkip(operation: "read" | "write", cause: unknown): void {
  console.warn(`[onboarding] company logo cache ${operation} skipped`, cause);
}

/**
 * A miss and an unreachable Redis are the same answer to the caller, so both
 * typed failures — `RedisUnavailableError` and the timeout — collapse to `null`
 * at this single decision point.
 */
const readCompanyLogo = Effect.fn("onboarding.companyLogoCache.read")(
  function* (input: CompanyLogoCacheKeyInput) {
    const client = readRedis;
    if (!client) {
      return null;
    }

    return yield* Effect.tryPromise({
      try: () => client.get<unknown>(buildCacheKey(input)),
      catch: (cause) => new RedisUnavailableError({ operation: "read", cause }),
    }).pipe(
      Effect.map((cached): CompanyLogoResult | null =>
        isCompanyLogoResult(cached) ? cached : null
      ),
      Effect.catchCause((cause) => {
        logCacheSkip("read", cause);
        return Effect.succeed<CompanyLogoResult | null>(null);
      })
    );
  }
);

const writeCompanyLogo = Effect.fn("onboarding.companyLogoCache.write")(
  function* (input: CompanyLogoCacheKeyInput, result: CompanyLogoResult) {
    const client = writeRedis;
    if (!client) {
      return;
    }

    yield* Effect.tryPromise({
      try: () =>
        client.set(buildCacheKey(input), result, {
          ex: result.url ? RESOLVED_TTL_SECONDS : UNRESOLVED_TTL_SECONDS,
        }),
      catch: (cause) =>
        new RedisUnavailableError({ operation: "write", cause }),
    }).pipe(
      Effect.asVoid,
      Effect.catchCause((cause) => {
        logCacheSkip("write", cause);
        return Effect.void;
      })
    );
  }
);

/**
 * The lookup behind this procedure is an external API call plus a rate-limit
 * round trip, on every page view. The cache is best effort: without Redis, or
 * on any Redis error or timeout, callers fall back to the live lookup.
 */
export function readCachedCompanyLogo(
  input: CompanyLogoCacheKeyInput
): Promise<CompanyLogoResult | null> {
  return Effect.runPromise(readCompanyLogo(input));
}

export function writeCachedCompanyLogo(
  input: CompanyLogoCacheKeyInput,
  result: CompanyLogoResult
): Promise<void> {
  return Effect.runPromise(writeCompanyLogo(input, result));
}
