import { Schema } from "effect";

export class ChatMirrorError extends Schema.TaggedError<ChatMirrorError>()(
  "ChatMirrorError",
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  }
) {}
