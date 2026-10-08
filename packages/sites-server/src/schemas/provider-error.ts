import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class SiteProviderRequestError extends taggedError<SiteProviderRequestError>()(
  "SiteProviderRequestError",
  {
    provider: Schema.Literals([
      "cloudflare",
      "domain_connect",
      "vercel",
      "github",
    ]),
    operation: Schema.String,
    status: Schema.NullOr(Schema.Number),
    message: Schema.String,
  }
) {}
