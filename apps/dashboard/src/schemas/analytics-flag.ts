import { Schema } from "effect";

export const analyticsFlagsResponseSchema = Schema.Struct({
  flags: Schema.Record(
    Schema.String,
    Schema.Struct({
      enabled: Schema.Boolean,
      reason: Schema.optionalKey(Schema.String),
    })
  ),
});
