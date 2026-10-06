import { createHash } from "node:crypto";

import { Data, Effect } from "effect";

import {
  OFFERING_CHECK_RATE_LIMITS,
  OFFERING_CHECK_RATE_LIMIT_SCRIPT,
  OFFERING_CHECK_REDIS_TIMEOUT,
  OFFERING_RATE_LIMIT_GLOBAL_KEY,
} from "@/constants/offering-check";
import type {
  OfferingCheckInput,
  OfferingRateLimitCheck,
  OfferingRateLimitScope,
} from "@/types/offering-check";
import { getClientIp } from "@/utils/client-ip";
import { getOfferingCheckBrandFeatureIdentity } from "@/utils/offering-identity";

import { getOfferingCheckRedis } from "./redis";

export class OfferingCheckRateLimitExceeded extends Data.TaggedError(
  "OfferingCheckRateLimitExceeded"
)<{
  readonly reset: number;
  readonly scope: OfferingRateLimitScope;
}> {}

export class OfferingCheckRateLimitUnavailable extends Data.TaggedError(
  "OfferingCheckRateLimitUnavailable"
)<{
  readonly cause: unknown;
}> {}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function limitCheck(
  name: keyof typeof OFFERING_CHECK_RATE_LIMITS,
  id: string
): OfferingRateLimitCheck {
  return {
    ...OFFERING_CHECK_RATE_LIMITS[name],
    key: `ratelimit:web:offering-check:${name}:${id}`,
  };
}

function scanLimitChecks(
  request: Request,
  input: OfferingCheckInput
): OfferingRateLimitCheck[] {
  const ip = sha256(getClientIp(request));
  return [
    limitCheck("perIpHour", ip),
    limitCheck("perIpDay", ip),
    limitCheck("perBrandDay", sha256(input.domain)),
    limitCheck(
      "perBrandFeatureDay",
      sha256(getOfferingCheckBrandFeatureIdentity(input))
    ),
    limitCheck("globalDay", OFFERING_RATE_LIMIT_GLOBAL_KEY),
  ];
}

const checkOfferingCheckRateLimit = Effect.fn("checkOfferingCheckRateLimit")(
  function* (checks: readonly OfferingRateLimitCheck[], consume: boolean) {
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
    }).pipe(
      Effect.timeout(OFFERING_CHECK_REDIS_TIMEOUT),
      Effect.catchTag("TimeoutError", (cause) =>
        Effect.fail(new OfferingCheckRateLimitUnavailable({ cause }))
      )
    );
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
          scope: rejected.scope,
        })
      );
    }
  }
);

export const peekOfferingCheckRateLimit = Effect.fn(
  "peekOfferingCheckRateLimit"
)(function* (request: Request, input: OfferingCheckInput) {
  yield* checkOfferingCheckRateLimit(scanLimitChecks(request, input), false);
});

export const enforceOfferingCheckRateLimit = Effect.fn(
  "enforceOfferingCheckRateLimit"
)(function* (request: Request, input: OfferingCheckInput) {
  yield* checkOfferingCheckRateLimit(scanLimitChecks(request, input), true);
});

export const enforceOfferingCheckPreflightRateLimit = Effect.fn(
  "enforceOfferingCheckPreflightRateLimit"
)(function* (request: Request) {
  yield* checkOfferingCheckRateLimit(
    [limitCheck("preflightPerIpMinute", sha256(getClientIp(request)))],
    true
  );
});
