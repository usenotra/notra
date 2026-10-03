import {
  assertPublicHttpUrlResolution,
  PublicUrlValidationError,
} from "@notra/utils/url";
import { Effect } from "effect";

import { BrandIdentityWebsiteUrlError } from "../errors/brand-identities";

export const validateBrandWebsiteUrl = Effect.fn(
  "brandIdentities.validateWebsiteUrl"
)(function* (url: string) {
  yield* Effect.tryPromise({
    try: () => assertPublicHttpUrlResolution(url),
    catch: (error) =>
      new BrandIdentityWebsiteUrlError({
        message:
          error instanceof PublicUrlValidationError
            ? error.message
            : "Website domain check is temporarily unavailable. Please try again.",
        temporary:
          !(error instanceof PublicUrlValidationError) ||
          error.reason === "temporary",
      }),
  });
});
