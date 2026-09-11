import { Schema } from "effect";

export class SocialPublishError extends Schema.TaggedError<SocialPublishError>()(
  "SocialPublishError",
  {
    cause: Schema.Defect(),
    message: Schema.String,
  }
) {}
