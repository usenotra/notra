/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class SubscriptionBillingError extends Schema.TaggedError<SubscriptionBillingError>()(
  "SubscriptionBillingError",
  { cause: Schema.Defect() }
) {}

export class GeoBillingError extends Schema.TaggedError<GeoBillingError>()(
  "GeoBillingError",
  { cause: Schema.Defect() }
) {}
