import { Clock, Effect, Schedule } from "effect";

import {
  CHAT_ABORT_POLL_INTERVAL_MS,
  CHAT_ACTIVE_STREAM_REFRESH_INTERVAL_MS,
} from "../constants/chat";
import type { StartChatAbortPollingArgs } from "../types/chat";
import { isChatAborted, refreshActiveChatStream } from "./history";

export const pollChatAbort = Effect.fn("Chat.pollAbort")(function* ({
  organizationId,
  chatId,
  streamId,
  onAbort,
  intervalMs = CHAT_ABORT_POLL_INTERVAL_MS,
}: StartChatAbortPollingArgs) {
  let nextLeaseRefreshAt = 0;
  const pass = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    if (now >= nextLeaseRefreshAt) {
      const refreshed = yield* Effect.tryPromise(() =>
        refreshActiveChatStream(organizationId, chatId, streamId)
      );
      nextLeaseRefreshAt = now + CHAT_ACTIVE_STREAM_REFRESH_INTERVAL_MS;
      if (!refreshed) {
        return true;
      }
    }
    return yield* Effect.tryPromise(() =>
      isChatAborted(organizationId, chatId, streamId)
    );
  }).pipe(
    Effect.catch((error) =>
      Effect.logError("Chat abort polling failed", error).pipe(Effect.as(false))
    ),
    Effect.flatMap((aborted) =>
      aborted
        ? Effect.sync(onAbort).pipe(Effect.andThen(Effect.interrupt))
        : Effect.void
    )
  );

  yield* pass.pipe(
    Effect.repeat(Schedule.spaced(intervalMs)),
    Effect.delay(intervalMs),
    Effect.annotateLogs({ organizationId, chatId, streamId })
  );
});
