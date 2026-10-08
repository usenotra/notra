import { Data, Effect } from "effect";

import { OFFERING_TURNSTILE_HEADER } from "@/constants/offering-check";
import { OFFERING_TURNSTILE_ACTION } from "@/constants/turnstile";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile/verify";

export class OfferingCheckVerificationRequired extends Data.TaggedError(
  "OfferingCheckVerificationRequired"
) {}

export class OfferingCheckVerificationUnavailable extends Data.TaggedError(
  "OfferingCheckVerificationUnavailable"
) {}

/**
 * Uncached scans cost money, so they need a Turnstile token for this tool.
 * Without Turnstile config, local dev skips the check and production fails
 * closed, like the rate limiter.
 */
export const ensureOfferingVisitorIsHuman = Effect.fn(
  "ensureOfferingVisitorIsHuman"
)(function* (request: Request) {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return yield* Effect.fail(new OfferingCheckVerificationUnavailable());
    }
    return;
  }
  const verified = yield* Effect.promise(() =>
    verifyTurnstile(
      request.headers.get(OFFERING_TURNSTILE_HEADER),
      OFFERING_TURNSTILE_ACTION
    )
  );
  if (!verified) {
    return yield* Effect.fail(new OfferingCheckVerificationRequired());
  }
});
