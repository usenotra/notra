import { Effect, Schema } from "effect";

export const cloudflareApiResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  result: Schema.optionalKey(Schema.Unknown),
});

export const cloudflareCustomHostnameSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  hostname: Schema.NonEmptyString,
  status: Schema.String.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("pending"))
  ),
  verification_errors: Schema.optionalKey(
    Schema.mutable(Schema.Array(Schema.String))
  ),
  ownership_verification: Schema.optionalKey(
    Schema.Struct({
      type: Schema.optionalKey(Schema.String),
      name: Schema.optionalKey(Schema.String),
      value: Schema.optionalKey(Schema.String),
    })
  ),
  ssl: Schema.optionalKey(
    Schema.Struct({
      status: Schema.optionalKey(Schema.String),
      validation_errors: Schema.optionalKey(
        Schema.mutable(
          Schema.Array(
            Schema.Struct({
              message: Schema.String.pipe(
                Schema.withDecodingDefaultKey(Effect.succeed(""))
              ),
            })
          )
        )
      ),
      validation_records: Schema.optionalKey(
        Schema.mutable(
          Schema.Array(
            Schema.Struct({
              txt_name: Schema.optionalKey(Schema.String),
              txt_value: Schema.optionalKey(Schema.String),
              http_url: Schema.optionalKey(Schema.String),
              http_body: Schema.optionalKey(Schema.String),
            })
          )
        )
      ),
    })
  ),
});
