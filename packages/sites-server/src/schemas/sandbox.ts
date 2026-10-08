import { Schema } from "effect";

export const sandboxAllocationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
});
export const sandboxFileSchema = Schema.Struct({ content: Schema.String });
export const sandboxExecutionSchema = Schema.Struct({
  output: Schema.optional(Schema.NullOr(Schema.String)),
  error: Schema.optional(Schema.NullOr(Schema.String)),
  exit_code: Schema.Number,
});

const taggedError = Schema.TaggedError;

export class SandboxRequestError extends taggedError<SandboxRequestError>()(
  "SandboxRequestError",
  {
    operation: Schema.String,
    status: Schema.NullOr(Schema.Number),
    message: Schema.String,
  }
) {}
