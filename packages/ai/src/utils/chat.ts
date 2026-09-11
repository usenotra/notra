import type { UIMessage } from "ai";

import { CHAT_TITLE_MAX_LENGTH } from "../constants/chat";
import type {
  BuildChatFinishMetadataInput,
  ChatMessageMetadata,
  ChatSessionSummary,
} from "../types/chat";

function findLastUserMessageIndex(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }
  return -1;
}

export function stampUserMessageAuthors<T extends UIMessage>(
  messages: T[],
  authorUserId: string
): T[] {
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) {
    return messages;
  }

  const message = messages[lastUserIndex];
  if (!message) {
    return messages;
  }

  const metadata = (message.metadata ?? {}) as ChatMessageMetadata;
  if (metadata.authorUserId === authorUserId) {
    return messages;
  }

  const nextMessages = messages.slice();
  nextMessages[lastUserIndex] = {
    ...message,
    metadata: { ...metadata, authorUserId },
  };
  return nextMessages;
}

export function buildChatFinishMetadata({
  streamStartedAt,
  firstChunkAt,
  finishedAt,
  partUsage,
  usageSnapshot,
  model,
  requestedModel,
  thinkingLevel,
  requestedThinkingLevel,
}: BuildChatFinishMetadataInput) {
  const ttftMs =
    firstChunkAt !== null ? firstChunkAt - streamStartedAt : undefined;
  const generationDurationMs =
    firstChunkAt !== null ? finishedAt - firstChunkAt : undefined;
  const inputTokens = partUsage?.inputTokens ?? usageSnapshot.inputTokens;
  const outputTokens = partUsage?.outputTokens ?? usageSnapshot.outputTokens;
  const totalTokens = partUsage?.totalTokens ?? usageSnapshot.totalTokens;
  const cacheReadTokens =
    partUsage?.inputTokenDetails?.cacheReadTokens ??
    usageSnapshot.cacheReadTokens;
  const cacheWriteTokens =
    partUsage?.inputTokenDetails?.cacheWriteTokens ??
    usageSnapshot.cacheWriteTokens;
  const tokensPerSecond =
    generationDurationMs &&
    generationDurationMs > 0 &&
    outputTokens &&
    outputTokens > 0
      ? (outputTokens / generationDurationMs) * 1000
      : undefined;

  return {
    model,
    requestedModel,
    thinkingLevel,
    requestedThinkingLevel,
    inputTokens,
    outputTokens,
    totalTokens,
    cacheReadTokens,
    cacheWriteTokens,
    ttftMs,
    generationDurationMs,
    tokensPerSecond,
  };
}

export function normalizeChatTitle(title: string) {
  return title.replace(/\s+/g, " ").trim().slice(0, CHAT_TITLE_MAX_LENGTH);
}

export function formatChatIdFallback(chatId: string) {
  if (chatId.length <= 10) {
    return chatId;
  }
  return `${chatId.slice(0, 6)}…${chatId.slice(-3)}`;
}

export function chatSessionsQueryKey(
  organizationId: string | undefined,
  projectId?: string | null
) {
  return ["chat-sessions", organizationId, projectId ?? null] as const;
}

export function chatSessionPath(organizationId: string, chatId: string) {
  return `/api/organizations/${organizationId}/chat/${chatId}`;
}

export function chatSessionsPath(
  organizationId: string,
  projectId?: string | null
) {
  const base = `/api/organizations/${organizationId}/chat/sessions`;
  return projectId
    ? `${base}?projectId=${encodeURIComponent(projectId)}`
    : base;
}

export function contentChatSessionsQueryKey(
  organizationId: string,
  contentId: string
) {
  return ["content-chat-sessions", organizationId, contentId] as const;
}

export function contentChatHistoryQueryKey(
  organizationId: string,
  contentId: string,
  chatId: string | null
) {
  return ["content-chat-history", organizationId, contentId, chatId] as const;
}

export function contentChatSessionsPath(
  organizationId: string,
  contentId: string
) {
  return `/api/organizations/${organizationId}/content/${contentId}/chat`;
}

export function contentChatHistoryPath(
  organizationId: string,
  contentId: string,
  chatId: string
) {
  return `/api/organizations/${organizationId}/content/${contentId}/chat/${encodeURIComponent(chatId)}`;
}

export function dashboardAgentChatSessionsQueryKey(organizationId: string) {
  return ["dashboard-agent-chat-sessions", organizationId] as const;
}

export function dashboardAgentChatHistoryQueryKey(
  organizationId: string,
  chatId: string | null
) {
  return ["dashboard-agent-chat-history", organizationId, chatId] as const;
}

export function dashboardAgentChatSessionsPath(organizationId: string) {
  return `/api/organizations/${organizationId}/dashboard-agent/chat`;
}

export function dashboardAgentChatHistoryPath(
  organizationId: string,
  chatId: string
) {
  return `/api/organizations/${organizationId}/dashboard-agent/chat/${encodeURIComponent(chatId)}`;
}

export function sortChatSessions(sessions: ChatSessionSummary[]) {
  return [...sessions].sort((left, right) => {
    const leftPinnedAt = left.pinnedAt ? Date.parse(left.pinnedAt) : Number.NaN;
    const rightPinnedAt = right.pinnedAt
      ? Date.parse(right.pinnedAt)
      : Number.NaN;

    if (Number.isFinite(leftPinnedAt) || Number.isFinite(rightPinnedAt)) {
      if (!Number.isFinite(leftPinnedAt)) {
        return 1;
      }

      if (!Number.isFinite(rightPinnedAt)) {
        return -1;
      }

      return rightPinnedAt - leftPinnedAt;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}
