import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Data, Effect } from "effect";
import type { NextRequest } from "next/server";

import { IP_CHECKER_RATE_LIMIT } from "@/constants/ip-checker";
import { getClientIp } from "@/utils/client-ip";

class IpCheckRateLimitExceeded extends Data.TaggedError(
  "IpCheckRateLimitExceeded"
)<{
  readonly reset: number;
}> {}

class IpCheckRateLimitUnavailable extends Data.TaggedError(
  "IpCheckRateLimitUnavailable"
)<{
  readonly cause: unknown;
}> {}

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) {
    return limiter;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!(url && token)) {
    return null;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    prefix: "ratelimit:web:ip-checker",
    limiter: Ratelimit.slidingWindow(
      IP_CHECKER_RATE_LIMIT.requests,
      IP_CHECKER_RATE_LIMIT.window
    ),
  });
  return limiter;
}

export const enforceIpCheckRateLimit = Effect.fn("enforceIpCheckRateLimit")(
  function* (request: NextRequest) {
    const ratelimit = getLimiter();
    if (!ratelimit) {
      if (process.env.NODE_ENV === "production") {
        return yield* Effect.fail(
          new IpCheckRateLimitUnavailable({
            cause: new Error(
              "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set"
            ),
          })
        );
      }
      return;
    }
    const key = createHash("sha256").update(getClientIp(request)).digest("hex");
    const result = yield* Effect.tryPromise({
      try: () => ratelimit.limit(key),
      catch: (cause) => new IpCheckRateLimitUnavailable({ cause }),
    });
    if (!result.success) {
      return yield* Effect.fail(
        new IpCheckRateLimitExceeded({ reset: result.reset })
      );
    }
  }
);
