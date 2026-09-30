import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Data, Effect } from "effect";
import type { NextRequest } from "next/server";

type LimiterKind = "lookup" | "render" | "render-global";

const LIMITS: Record<LimiterKind, { requests: number; window: "1 h" }> = {
  lookup: { requests: 20, window: "1 h" },
  render: { requests: 10, window: "1 h" },
  // Shared cap across every caller/instance so IP rotation can't multiply the
  // expensive render budget beyond a bounded total per hour.
  "render-global": { requests: 40, window: "1 h" },
};

class StarVideoRateLimitExceeded extends Data.TaggedError(
  "StarVideoRateLimitExceeded"
)<{ readonly reset: number }> {}

const limiters: Partial<Record<LimiterKind, Ratelimit | null>> = {};

function getLimiter(kind: LimiterKind): Ratelimit | null {
  if (limiters[kind] !== undefined) {
    return limiters[kind] ?? null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token)) {
    limiters[kind] = null;
    return null;
  }

  limiters[kind] = new Ratelimit({
    redis: new Redis({ url, token }),
    prefix: `ratelimit:web:star-video-${kind}`,
    limiter: Ratelimit.slidingWindow(
      LIMITS[kind].requests,
      LIMITS[kind].window
    ),
  });
  return limiters[kind] ?? null;
}

function getClientIp(request: NextRequest): string {
  // On Vercel only the platform-set x-vercel-forwarded-for is trustworthy.
  // Off-Vercel we assume a trusted reverse proxy overwrites x-forwarded-for;
  // if the app is exposed without one these headers are client-spoofable.
  if (process.env.VERCEL) {
    return (
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function getRateLimitKey(request: NextRequest): string {
  return createHash("sha256").update(getClientIp(request)).digest("hex");
}

const enforceLimit = Effect.fn("enforceStarVideoLimit")(function* (
  kind: LimiterKind,
  key: string
) {
  const limiter = getLimiter(kind);

  if (!limiter) {
    // Fail closed on any deployed environment (production, preview, staging)
    // so the endpoints are never left unprotected when Redis is misconfigured.
    // Only the local dev environment (no VERCEL, non-production) is allowed
    // through without a limiter.
    const isDeployed =
      process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isDeployed) {
      console.warn(
        `star-video rate limiter unavailable for "${kind}"; failing closed`
      );
      return yield* Effect.fail(new StarVideoRateLimitExceeded({ reset: 0 }));
    }
    return;
  }

  // Fail closed on Redis errors: a transient outage must not silently
  // disable rate limiting on the expensive render path.
  const result = yield* Effect.tryPromise({
    try: () => limiter.limit(key),
    catch: () => new StarVideoRateLimitExceeded({ reset: 0 }),
  });

  if (!result.success) {
    return yield* Effect.fail(
      new StarVideoRateLimitExceeded({ reset: result.reset })
    );
  }
});

export const enforceStarVideoRateLimit = Effect.fn("enforceStarVideoRateLimit")(
  function* (request: NextRequest, kind: "lookup" | "render") {
    yield* enforceLimit(kind, getRateLimitKey(request));
  }
);

export const enforceGlobalRenderLimit = Effect.fn("enforceGlobalRenderLimit")(
  function* () {
    yield* enforceLimit("render-global", "global");
  }
);
