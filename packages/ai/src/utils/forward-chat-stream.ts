import { Effect, Stream } from "effect";

import { CHAT_STREAM_BUFFER_CAPACITY } from "../constants/chat";
import { ChatStreamDeliveryError } from "../schemas/chat-stream";
import type { ForwardChatStreamInput } from "../types/chat";
import { chatStreamSource } from "./with-chat-stream-cleanup";

export const forwardChatStream = Effect.fn("Chat.forwardStream")(function* ({
  stream,
  emit,
}: ForwardChatStreamInput) {
  yield* chatStreamSource(stream).pipe(
    Stream.buffer({ capacity: CHAT_STREAM_BUFFER_CAPACITY }),
    Stream.chunks,
    Stream.runForEach((batch) =>
      Effect.tryPromise({
        try: () => emit([...batch]),
        catch: (cause) =>
          new ChatStreamDeliveryError({ operation: "publish", cause }),
      }).pipe(Effect.uninterruptible)
    )
  );
});
