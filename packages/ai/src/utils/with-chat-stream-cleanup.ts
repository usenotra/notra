import type { UIMessageChunk } from "ai";
import { Cause, Effect, Stream } from "effect";

import { ChatStreamDeliveryError } from "../schemas/chat-stream";

export function chatStreamSource(
  stream: ReadableStream<UIMessageChunk>,
  cleanup?: () => Promise<void>
): Stream.Stream<UIMessageChunk, ChatStreamDeliveryError> {
  return Stream.unwrap(
    Effect.gen(function* () {
      let readFailed = false;
      const reader = yield* Effect.acquireRelease(
        Effect.sync(() => stream.getReader()),
        (reader) =>
          Effect.tryPromise(() => reader.cancel()).pipe(
            Effect.catch((error) =>
              readFailed
                ? Effect.void
                : Effect.logError("Chat stream cancellation failed", error)
            ),
            Effect.ensuring(Effect.sync(() => reader.releaseLock())),
            Effect.ensuring(
              Effect.promise(() => cleanup?.() ?? Promise.resolve())
            )
          )
      );
      return Stream.fromPull(
        Effect.succeed(
          Effect.gen(function* () {
            const result = yield* Effect.tryPromise({
              try: () => reader.read(),
              catch: (cause) => {
                readFailed = true;
                return new ChatStreamDeliveryError({
                  operation: "read",
                  cause,
                });
              },
            });
            return result.done
              ? yield* Cause.done()
              : ([result.value] as const);
          })
        )
      );
    })
  );
}

export function withChatStreamCleanup(
  stream: ReadableStream<UIMessageChunk>,
  cleanup: () => Promise<void>
): ReadableStream<UIMessageChunk> {
  return Stream.toReadableStream(chatStreamSource(stream, cleanup));
}
