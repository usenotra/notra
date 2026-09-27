import { Effect, Exit, Scope } from "effect";

import type { ChatStreamLifecycleInput } from "../types/chat";
import { pollChatAbort } from "./abort-polling";
import { clearActiveChatStream, clearChatAbortFlag } from "./history";

const acquireChatStream = Effect.fn("Chat.acquireStream")(function* (
  input: ChatStreamLifecycleInput
) {
  const { organizationId, chatId, streamId, abortSignal } = input;
  const controller = yield* Effect.acquireRelease(
    Effect.sync(() => new AbortController()),
    (controller) =>
      Effect.gen(function* () {
        controller.abort();
        yield* Effect.all(
          [
            Effect.tryPromise(() =>
              clearChatAbortFlag(organizationId, chatId, streamId)
            ),
            Effect.tryPromise(() =>
              clearActiveChatStream(organizationId, chatId, streamId)
            ),
          ].map((cleanup) =>
            cleanup.pipe(
              Effect.catch((error) =>
                Effect.logError("Chat stream cleanup failed", error)
              )
            )
          ),
          { concurrency: "unbounded", discard: true }
        );
      }).pipe(Effect.annotateLogs({ organizationId, chatId, streamId }))
  );
  const signal = abortSignal
    ? AbortSignal.any([abortSignal, controller.signal])
    : controller.signal;

  yield* pollChatAbort({ ...input, onAbort: () => controller.abort() }).pipe(
    Effect.forkScoped
  );
  return { signal };
});

// The SDK owns the response after the handler returns; close this scope in onEnd.
export async function createChatStreamLifecycle(
  input: ChatStreamLifecycleInput
) {
  const scope = Effect.runSync(Scope.make());
  const close = Effect.runSync(Effect.cached(Scope.close(scope, Exit.void)));
  try {
    const lifecycle = await Effect.runPromise(
      acquireChatStream(input).pipe(Scope.provide(scope))
    );
    return { ...lifecycle, close: () => Effect.runPromise(close) };
  } catch (error) {
    await Effect.runPromise(close);
    throw error;
  }
}
