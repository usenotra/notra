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
