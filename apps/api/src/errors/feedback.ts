/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class FeedbackProjectNotFoundError extends Schema.TaggedError<FeedbackProjectNotFoundError>()(
  "FeedbackProjectNotFoundError",
  {}
) {}

export class FeedbackNotFoundError extends Schema.TaggedError<FeedbackNotFoundError>()(
  "FeedbackNotFoundError",
  {}
) {}

export class FeedbackDatabaseError extends Schema.TaggedError<FeedbackDatabaseError>()(
  "FeedbackDatabaseError",
  { cause: Schema.Defect() }
) {}
