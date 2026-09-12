import { Schema } from "effect";

export class SubscriptionBillingError extends Schema.TaggedError<SubscriptionBillingError>()(
  "SubscriptionBillingError",
  { cause: Schema.Defect() }
) {}

export class GeoBillingError extends Schema.TaggedError<GeoBillingError>()(
  "GeoBillingError",
  { cause: Schema.Defect() }
) {}
