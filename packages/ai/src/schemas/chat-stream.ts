import { Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not an Error constructor.
export class ChatStreamDeliveryError extends Schema.TaggedError<ChatStreamDeliveryError>()(
  "ChatStreamDeliveryError",
  { operation: Schema.Literals(["read", "publish"]), cause: Schema.Unknown }
) {}
