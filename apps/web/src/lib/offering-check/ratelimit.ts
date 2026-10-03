import { createHash } from "node:crypto";

import { Data, Effect } from "effect";
import type { NextRequest } from "next/server";

import {
  OFFERING_CHECK_RATE_LIMITS,
  OFFERING_CHECK_RATE_LIMIT_SCRIPT,
} from "@/constants/offering-check";
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

const GLOBAL_KEY = "global";

function ipHash(request: NextRequest) {
  return createHash("sha256").update(getClientIp(request)).digest("hex");
}

function limitChecks(request: NextRequest, input: OfferingCheckInput) {
  const ipKey = ipHash(request);
  const brandKey = createHash("sha256").update(input.domain).digest("hex");
  const brandFeatureKey = createHash("sha256")
    .update(getOfferingCheckBrandFeatureIdentity(input))
    .digest("hex");
  return (
    [
      { name: "perIpHour", key: ipKey },
      { name: "perIpDay", key: ipKey },
      { name: "perBrandDay", key: brandKey },
      { name: "perBrandFeatureDay", key: brandFeatureKey },
      { name: "globalDay", key: GLOBAL_KEY },
    ] as const
  ).map(({ name, key }) => ({
    ...OFFERING_CHECK_RATE_LIMITS[name],
    key: `ratelimit:web:offering-check:${name}:${key}`,
  }));
}

function preflightLimitChecks(request: NextRequest) {
  return [
    {
      ...OFFERING_CHECK_RATE_LIMITS.preflightPerIpMinute,
      key: `ratelimit:web:offering-check:preflightPerIpMinute:${ipHash(request)}`,
    },
  ];
}

const checkOfferingCheckRateLimit = Effect.fn("checkOfferingCheckRateLimit")(
  function* (
    checks:
      | ReturnType<typeof limitChecks>
      | ReturnType<typeof preflightLimitChecks>,
    consume: boolean
  ) {
    const redis = getOfferingCheckRedis();
    if (!redis) {
      if (process.env.NODE_ENV === "production") {
        return yield* Effect.fail(
          new OfferingCheckRateLimitUnavailable({
            cause: new Error(
              "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set"
            ),
          })
        );
      }
      return;
    }

    const now = Date.now();
    const keys = checks.flatMap(({ key, windowMs }) => {
      const window = Math.floor(now / windowMs);
      return [`${key}:${window}`, `${key}:${window - 1}`];
    });
    const args = [
      now,
      consume ? 1 : 0,
      ...checks.flatMap(({ requests, windowMs }) => [requests, windowMs]),
    ];
    const [allowed, rejectedIndex] = yield* Effect.tryPromise({
      try: () =>
        redis.eval<(string | number)[], [number, number]>(
          OFFERING_CHECK_RATE_LIMIT_SCRIPT,
          keys,
          args
        ),
      catch: (cause) => new OfferingCheckRateLimitUnavailable({ cause }),
    });
    if (allowed === 0) {
      const rejected = checks[rejectedIndex - 1];
      if (!rejected) {
        return yield* Effect.fail(
          new OfferingCheckRateLimitUnavailable({
            cause: new Error("Invalid rate limit response"),
          })
        );
      }
      return yield* Effect.fail(
        new OfferingCheckRateLimitExceeded({
          reset: (Math.floor(now / rejected.windowMs) + 1) * rejected.windowMs,
        })
      );
    }
  }
);

export const peekOfferingCheckRateLimit = Effect.fn(
  "peekOfferingCheckRateLimit"
)(function* (request: NextRequest, input: OfferingCheckInput) {
  yield* checkOfferingCheckRateLimit(limitChecks(request, input), false);
});

export const enforceOfferingCheckRateLimit = Effect.fn(
  "enforceOfferingCheckRateLimit"
)(function* (request: NextRequest, input: OfferingCheckInput) {
  yield* checkOfferingCheckRateLimit(limitChecks(request, input), true);
});

export const enforceOfferingCheckPreflightRateLimit = Effect.fn(
  "enforceOfferingCheckPreflightRateLimit"
)(function* (request: NextRequest) {
  yield* checkOfferingCheckRateLimit(preflightLimitChecks(request), true);
});
