import { chatTransportRequestInputSchema } from "@notra/ai/schemas/chat";
import type { ChatUIMessage, ContextItem } from "@notra/ai/types/chat";
import { DefaultChatTransport } from "ai";

import { CHAT_ACTIVE_STREAM_CONFLICT_STATUS } from "@/constants/chat-active-stream";

export type StandaloneChatTransportContext = {
  context: ContextItem[];
  hasCustomizedContext: boolean;
  organizationId: string;
  selectedModel: string;
  thinkingLevel: string;
};

export function createStandaloneChatTransport({
  activeProjectId,
  getContext,
  getSendableMessages,
  onChatCreated,
  onStreamConflict,
  organizationId,
  setPendingMessageId,
}: {
  activeProjectId: string | null;
  getContext: () => StandaloneChatTransportContext;
  getSendableMessages: (messages: ChatUIMessage[]) => ChatUIMessage[];
  onChatCreated?: (chatId: string) => void | Promise<void>;
  onStreamConflict: (messageId: string) => void;
  organizationId: string;
  setPendingMessageId: (id: string | null) => void;
}) {
  return new DefaultChatTransport<ChatUIMessage>({
    api: `/api/organizations/${organizationId}/chat`,
    prepareSendMessagesRequest: ({ id, messages }) => {
      const context = getContext();
      return {
        body: {
          chatId: id,
          projectId: activeProjectId ?? undefined,
          messages: getSendableMessages(messages),
          context: context.hasCustomizedContext ? context.context : undefined,
          model: context.selectedModel,
          enableThinking: context.thinkingLevel !== "off",
          thinkingLevel: context.thinkingLevel,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
    },
    prepareReconnectToStreamRequest: ({ id }) => ({
      api: `/api/organizations/${getContext().organizationId}/chat/${id}/stream`,
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

      const triggerResponse = await fetch(input, init);
      if (
        triggerResponse.status === CHAT_ACTIVE_STREAM_CONFLICT_STATUS &&
        latestMessageId
      ) {
        onStreamConflict(latestMessageId);
      }
      if (!triggerResponse.ok) {
        return triggerResponse;
      }

      const createdChatId = requestBody?.chatId;
      if (createdChatId) {
        void onChatCreated?.(createdChatId);
      }

      const contentType = triggerResponse.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        return triggerResponse;
      }

      if (!requestBody) {
        return triggerResponse;
      }

      return fetch(
        `/api/organizations/${getContext().organizationId}/chat/${requestBody.chatId}/stream`,
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
