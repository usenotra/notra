import { Schema } from "effect";

export class SlackApiError extends Schema.TaggedError<SlackApiError>()(
  "SlackApiError",
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  }
) {}
