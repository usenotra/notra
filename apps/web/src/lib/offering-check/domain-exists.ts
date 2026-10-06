import { lookup } from "node:dns/promises";

import { Data, Effect } from "effect";

import { OFFERING_CHECK_DNS_TIMEOUT } from "@/constants/offering-check";

export class OfferingCheckUnknownSite extends Data.TaggedError(
  "OfferingCheckUnknownSite"
)<{
  readonly domain: string;
}> {}

const NOT_FOUND_CODES = new Set(["ENOTFOUND", "ENODATA"]);

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    NOT_FOUND_CODES.has(error.code)
  );
}

/**
 * Fails only when DNS says the domain does not exist. Slow or broken DNS lets
 * the check through, so a resolver hiccup never locks visitors out.
 */
export const ensureOfferingSiteExists = Effect.fn("ensureOfferingSiteExists")(
  function* (domain: string) {
    const missing = yield* Effect.tryPromise(() => lookup(domain)).pipe(
      Effect.as(false),
      Effect.catch((error) => Effect.succeed(isNotFound(error.cause))),
      Effect.timeout(OFFERING_CHECK_DNS_TIMEOUT),
      Effect.orElseSucceed(() => false)
    );
    if (missing) {
      return yield* Effect.fail(new OfferingCheckUnknownSite({ domain }));
    }
  }
);
