import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class R2DeleteFailedError extends taggedError<R2DeleteFailedError>()(
  "R2DeleteFailedError",
  { failedCount: Schema.Number, message: Schema.String }
) {}
