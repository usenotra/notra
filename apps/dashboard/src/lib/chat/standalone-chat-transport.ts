import { chatTransportRequestInputSchema } from "@notra/ai/schemas/chat";
import type { ChatUIMessage, ContextItem } from "@notra/ai/types/chat";
import { DefaultChatTransport } from "ai";
import type { RefObject } from "react";

import { CHAT_ACTIVE_STREAM_CONFLICT_STATUS } from "@/constants/chat-active-stream";

export type StandaloneChatTransportLive = {
  activeProjectId: RefObject<string | null>;
  context: RefObject<ContextItem[]>;
  hasCustomizedContext: RefObject<boolean>;
  onChatCreated: RefObject<((chatId: string) => void) | undefined>;
  organizationId: RefObject<string>;
  selectedModel: RefObject<string>;
  streamConflict: RefObject<string | null>;
  thinkingLevel: RefObject<string>;
};

export function createStandaloneChatTransport({
  getSendableMessages,
  live,
  setPendingMessageId,
}: {
  getSendableMessages: (messages: ChatUIMessage[]) => ChatUIMessage[];
  live: StandaloneChatTransportLive;
  setPendingMessageId: (id: string | null) => void;
}) {
  return new DefaultChatTransport<ChatUIMessage>({
    api: "/api/organizations/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        chatId: id,
        projectId: live.activeProjectId.current ?? undefined,
        messages: getSendableMessages(messages),
        context: live.hasCustomizedContext.current
          ? live.context.current
          : undefined,
        model: live.selectedModel.current,
        enableThinking: live.thinkingLevel.current !== "off",
        thinkingLevel: live.thinkingLevel.current,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
    prepareReconnectToStreamRequest: ({ id }) => ({
      api: `/api/organizations/${live.organizationId.current}/chat/${id}/stream`,
      headers: { "x-chat-reconnect": "true" },
    }),
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);

      if (headers.get("x-chat-reconnect") === "true") {
        return fetch(input, init);
      }

      const parsedRequestBody = chatTransportRequestInputSchema.safeParse(
        init?.body
      );
      const requestBody = parsedRequestBody.success
        ? parsedRequestBody.data
        : null;

      const latestMessageId = requestBody?.messages.at(-1)?.id;

      if (latestMessageId) {
        setPendingMessageId(latestMessageId);
      }

      const organizationId = live.organizationId.current;
      const triggerResponse = await fetch(
        `/api/organizations/${organizationId}/chat`,
        init
      );
      if (
        triggerResponse.status === CHAT_ACTIVE_STREAM_CONFLICT_STATUS &&
        latestMessageId
      ) {
        live.streamConflict.current = latestMessageId;
      }
      if (!triggerResponse.ok) {
        return triggerResponse;
      }

      const createdChatId = requestBody?.chatId;
      if (createdChatId) {
        live.onChatCreated.current?.(createdChatId);
      }

      const contentType = triggerResponse.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        return triggerResponse;
      }

      if (!requestBody) {
        return triggerResponse;
      }

      return fetch(
        `/api/organizations/${live.organizationId.current}/chat/${requestBody.chatId}/stream`,
        {
          method: "GET",
          headers: init?.headers,
          credentials: init?.credentials,
          signal: init?.signal,
        }
      );
    },
  });
}
