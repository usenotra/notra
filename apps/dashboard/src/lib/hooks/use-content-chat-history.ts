"use client";

import {
  chatSessionsListResponseSchema,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import type { ChatSessionSummary } from "@notra/ai/types/chat";
import {
  contentChatHistoryPath,
  contentChatHistoryQueryKey,
  contentChatSessionsPath,
  contentChatSessionsQueryKey,
} from "@notra/ai/utils/chat";
import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useEffect, useReducer } from "react";

import { INITIAL_CONTENT_CHAT_UI_STATE } from "@/constants/content-editor-state";
import type { UseContentChatHistoryOptions } from "@/types/content/chat";
import { contentChatUiReducer } from "@/utils/content-editor-state";

export function useContentChatHistory({
  organizationId,
  contentId,
}: UseContentChatHistoryOptions) {
  const [state, dispatch] = useReducer(
    contentChatUiReducer,
    INITIAL_CONTENT_CHAT_UI_STATE
  );
  const { activeChatId, chatIdToHydrate } = state;
  const sessionsQuery = useQuery<ChatSessionSummary[]>({
    queryKey: contentChatSessionsQueryKey(organizationId, contentId),
    queryFn: async () => {
      const response = await fetch(
        contentChatSessionsPath(organizationId, contentId)
      );
      if (!response.ok) {
        throw new Error("Failed to load content chat sessions");
      }
      const parsed = chatSessionsListResponseSchema.safeParse(
        await response.json()
      );
      if (!parsed.success) {
        throw new Error("Invalid content chat sessions response");
      }
      return parsed.data.sessions ?? [];
    },
    staleTime: 60_000,
  });
  const historyQuery = useQuery<UIMessage[] | null>({
    queryKey: contentChatHistoryQueryKey(
      organizationId,
      contentId,
      activeChatId
    ),
    queryFn: async () => {
      if (!activeChatId) {
        return null;
      }
      const response = await fetch(
        contentChatHistoryPath(organizationId, contentId, activeChatId)
      );
      if (!response.ok) {
        throw new Error("Failed to load content chat history");
      }
      const payload = await response.json();
      const parsed = uiMessageSchema.array().safeParse(payload?.messages);
      if (!parsed.success) {
        throw new Error("Invalid content chat history response");
      }
      return parsed.data;
    },
    enabled: Boolean(activeChatId && chatIdToHydrate === activeChatId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // A failed sessions request still seeds a fresh chat id so the composer
    // stays usable; there is simply nothing to hydrate in that case.
    if (activeChatId || sessionsQuery.isPending) {
      return;
    }
    const latestChatId = sessionsQuery.data?.at(0)?.chatId;
    dispatch({
      type: "chatInitialized",
      chatId: latestChatId ?? crypto.randomUUID(),
      hydrate: Boolean(latestChatId),
    });
  }, [activeChatId, dispatch, sessionsQuery.data, sessionsQuery.isPending]);

  return {
    state,
    dispatch,
    sessions: sessionsQuery.data ?? [],
    history: historyQuery.data,
    isHistoryLoading: sessionsQuery.isPending || historyQuery.isFetching,
    isUnavailable:
      !activeChatId ||
      sessionsQuery.isPending ||
      historyQuery.isFetching ||
      historyQuery.isError,
  };
}
