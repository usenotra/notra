import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Data, Effect } from "effect";
import type { NextRequest } from "next/server";

import { OFFERING_CHECK_RATE_LIMITS } from "@/constants/offering-check";
import type { OfferingCheckInput } from "@/types/offering-check";
import { getClientIp } from "@/utils/client-ip";
import { getOfferingCheckBrandFeatureIdentity } from "@/utils/offering-check";

import { getOfferingCheckRedis } from "./redis";

class OfferingCheckRateLimitExceeded extends Data.TaggedError(
  "OfferingCheckRateLimitExceeded"
)<{
  readonly reset: number;
}> {}

class OfferingCheckRateLimitUnavailable extends Data.TaggedError(
  "OfferingCheckRateLimitUnavailable"
)<{
  readonly cause: unknown;
}> {}

type LimitName = keyof typeof OFFERING_CHECK_RATE_LIMITS;

const GLOBAL_KEY = "global";

let limiters: Record<LimitName, Ratelimit> | null = null;

function getLimiters(): Record<LimitName, Ratelimit> | null {
  if (limiters) {
    return limiters;
  }
  const redis = getOfferingCheckRedis();
  if (!redis) {
    return null;
  }
  const build = (name: LimitName) =>
    new Ratelimit({
      redis,
      prefix: `ratelimit:web:offering-check:${name}`,
      limiter: Ratelimit.slidingWindow(
        OFFERING_CHECK_RATE_LIMITS[name].requests,
        OFFERING_CHECK_RATE_LIMITS[name].window
      ),
    });
  limiters = {
    perIpHour: build("perIpHour"),
    perIpDay: build("perIpDay"),
    perBrandDay: build("perBrandDay"),
    perBrandFeatureDay: build("perBrandFeatureDay"),
    globalDay: build("globalDay"),
  };
  return limiters;
}

function limitChecks(
  ratelimits: Record<LimitName, Ratelimit>,
  request: NextRequest,
  input: OfferingCheckInput
) {
  const ipKey = createHash("sha256").update(getClientIp(request)).digest("hex");
  const brandKey = createHash("sha256").update(input.domain).digest("hex");
  const brandFeatureKey = createHash("sha256")
    .update(getOfferingCheckBrandFeatureIdentity(input))
    .digest("hex");
  return [
    { limiter: ratelimits.perIpHour, key: ipKey },
    { limiter: ratelimits.perIpDay, key: ipKey },
    { limiter: ratelimits.perBrandDay, key: brandKey },
    { limiter: ratelimits.perBrandFeatureDay, key: brandFeatureKey },
    { limiter: ratelimits.globalDay, key: GLOBAL_KEY },
  ];
}

const requireLimiters = Effect.fn("requireOfferingCheckLimiters")(function* () {
  const ratelimits = getLimiters();
  if (!ratelimits && process.env.NODE_ENV === "production") {
    return yield* Effect.fail(
      new OfferingCheckRateLimitUnavailable({
        cause: new Error(
          "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set"
        ),
      })
    );
  }
  return ratelimits;
});

export const peekOfferingCheckRateLimit = Effect.fn(
  "peekOfferingCheckRateLimit"
)(function* (request: NextRequest, input: OfferingCheckInput) {
  const ratelimits = yield* requireLimiters();
  if (!ratelimits) {
    return;
  }
  for (const check of limitChecks(ratelimits, request, input)) {
    const result = yield* Effect.tryPromise({
      try: () => check.limiter.getRemaining(check.key),
      catch: (cause) => new OfferingCheckRateLimitUnavailable({ cause }),
    });
    if (result.remaining <= 0) {
      return yield* Effect.fail(
        new OfferingCheckRateLimitExceeded({ reset: result.reset })
      );
    }
  }
});

export const enforceOfferingCheckRateLimit = Effect.fn(
  "enforceOfferingCheckRateLimit"
)(function* (request: NextRequest, input: OfferingCheckInput) {
  const ratelimits = yield* requireLimiters();
  if (!ratelimits) {
    return;
  }
  for (const check of limitChecks(ratelimits, request, input)) {
    const result = yield* Effect.tryPromise({
      try: () => check.limiter.limit(check.key),
      catch: (cause) => new OfferingCheckRateLimitUnavailable({ cause }),
    });
    if (!result.success) {
      return yield* Effect.fail(
        new OfferingCheckRateLimitExceeded({ reset: result.reset })
      );
    }
  }
});
