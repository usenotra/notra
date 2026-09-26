import { createHash } from "node:crypto";

import { Effect } from "effect";

import {
  OFFERING_CHECK_CACHE_PREFIX,
  OFFERING_CHECK_CACHE_SECONDS,
} from "@/constants/offering-check";
import { offeringCheckResultSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
} from "@/types/offering-check";
import { getOfferingCheckCacheIdentity } from "@/utils/offering-check";

import { getOfferingCheckRedis } from "./redis";

function cacheKey(input: OfferingCheckInput): string {
  const digest = createHash("sha256")
    .update(getOfferingCheckCacheIdentity(input))
    .digest("hex");
  return `${OFFERING_CHECK_CACHE_PREFIX}:${digest}`;
}

export const readCachedOfferingCheck = Effect.fn("offeringCheck.readCache")(
  function* (input: OfferingCheckInput) {
    const redis = getOfferingCheckRedis();
    if (!redis) {
      return null;
    }
    const cached = yield* Effect.tryPromise(() =>
      redis.get(cacheKey(input))
    ).pipe(Effect.orElseSucceed(() => null));
    const parsed = offeringCheckResultSchema.safeParse(cached);
    return parsed.success ? parsed.data : null;
  }
);

export const writeCachedOfferingCheck = Effect.fn("offeringCheck.writeCache")(
  function* (input: OfferingCheckInput, result: OfferingCheckResult) {
    const redis = getOfferingCheckRedis();
    if (!redis) {
      return;
    }
    yield* Effect.tryPromise(() =>
      redis.set(cacheKey(input), result, { ex: OFFERING_CHECK_CACHE_SECONDS })
    ).pipe(Effect.ignore);
  }
);
