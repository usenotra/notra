import { Schema } from "effect";

/** Shape of the one flag this app reads; other keys are ignored. */
export const analyticsFlagSchema = Schema.Struct({
  enabled: Schema.Boolean,
  reason: Schema.optionalKey(Schema.String),
});

/**
 * Entries stay `unknown`: Databuddy returns every flag of the project, and an
 * unrelated flag with a different shape must not fail the whole decode.
 */
export const analyticsFlagsResponseSchema = Schema.Struct({
  flags: Schema.Record(Schema.String, Schema.Unknown),
});
