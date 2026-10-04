import {
  getActiveChatStream,
  getChatSession,
  getLastResponseStopped,
  isChatDeleted,
  loadChatHistory,
} from "@notra/ai/chat/history";
import { hydrateSavedChatPosts } from "@notra/ai/chat/posts";
import type { ChatUIMessage } from "@notra/ai/types/chat";

import {
  getSlackThreadPermalink,
  parseSlackExternalChannelKey,
} from "@/lib/slack/relay";

/** Returns null when the chat was deleted. */
export async function loadChatHistoryPayload(
  organizationId: string,
  chatId: string
) {
  if (await isChatDeleted(organizationId, chatId)) {
    return null;
  }

  const [messages, lastResponseStopped, activeStreamId, chatSession] =
    await Promise.all([
      loadChatHistory<ChatUIMessage>(organizationId, chatId),
      getLastResponseStopped(organizationId, chatId),
      getActiveChatStream(organizationId, chatId),
      getChatSession(organizationId, chatId),
    ]);
  const externalChannelId = chatSession?.externalChannelId ?? null;
  let slackThreadUrl: string | null = null;
  if (externalChannelId?.source === "slack" && externalChannelId.id) {
    const target = parseSlackExternalChannelKey(externalChannelId.id);
    if (target) {
      slackThreadUrl = await getSlackThreadPermalink(target);
    }
  }

  return {
    chatId,
    messages: await hydrateSavedChatPosts(organizationId, chatId, messages),
    lastResponseStopped,
    activeStreamId,
    externalChannelId,
    slackThreadUrl,
  };
}
