import { getSessionAttribute } from "@notra/tools/utils/session";
import { Effect } from "effect";
import { defineHook } from "eve/hooks";

import { ChatMirrorError } from "../lib/schemas/chat-mirror";
import {
  appendAndPublishMirrorMessage,
  mirrorAssistantMetadata,
  resolveMirrorChatId,
} from "../lib/utils/chat-mirror";

export default defineHook({
  events: {
    async "message.completed"(event, ctx) {
      const messageText = event.data.message;
      if (event.data.finishReason === "tool-calls" || !messageText?.trim()) {
        return;
      }

      await Effect.runPromise(
        Effect.gen(function* () {
          const organizationId = getSessionAttribute(ctx, "organizationId");
          const chatId = yield* Effect.tryPromise({
            try: () => resolveMirrorChatId(ctx),
            catch: (cause) =>
              new ChatMirrorError({
                cause,
                operation: "resolve-mirror-chat-id",
              }),
          });
          if (!(organizationId && chatId)) {
            return;
          }

          yield* appendAndPublishMirrorMessage(organizationId, chatId, {
            id: `eve:${ctx.session.id}:${event.data.turnId}:${event.data.stepIndex}`,
            role: "assistant",
            parts: [{ type: "text", text: messageText }],
            metadata: mirrorAssistantMetadata(event.data.turnId),
          });
        }).pipe(
          Effect.catch((error) =>
            Effect.logWarning("[agent] chat mirror failed", error)
          )
        )
      );
    },
  },
});
