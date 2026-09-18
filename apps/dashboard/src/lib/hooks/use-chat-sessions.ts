"use client";

import {
  chatSessionResponseSchema,
  chatSessionsListResponseSchema,
} from "@notra/ai/schemas/chat";
import type { ChatSessionSummary } from "@notra/ai/types/chat";
import {
  chatSessionPath,
  chatSessionsPath,
  chatSessionsQueryKey,
  sortChatSessions,
} from "@notra/ai/utils/chat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { mergePendingChatSessions } from "@/utils/chat-history-groups";

function chatSessionsPendingQueryKey(
  organizationId: string | undefined,
  projectId?: string | null
) {
  return ["chat-sessions-pending", organizationId, projectId ?? null] as const;
}

function createPendingChatSession(chatId: string): ChatSessionSummary {
  const now = new Date().toISOString();
  return {
    chatId,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    pinnedAt: null,
  };
}

const EMPTY_PENDING_CHAT_SESSIONS: ChatSessionSummary[] = [];

export function useChatSessions() {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const { projectId, isResolved } = useActiveProject();
  const queryKey = chatSessionsQueryKey(organizationId, projectId);
  const pendingQueryKey = chatSessionsPendingQueryKey(
    organizationId,
    projectId
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const response = await fetch(chatSessionsPath(organizationId, projectId));
      if (!response.ok) {
        return [];
      }
      const parsed = chatSessionsListResponseSchema.safeParse(
        await response.json()
      );
      return parsed.success ? (parsed.data.sessions ?? []) : [];
    },
    enabled: Boolean(organizationId) && isResolved,
    staleTime: 1000 * 60,
  });
  const pendingQuery = useQuery({
    queryKey: pendingQueryKey,
    queryFn: async () => EMPTY_PENDING_CHAT_SESSIONS,
    enabled: false,
    initialData: EMPTY_PENDING_CHAT_SESSIONS,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const { sessions, generatingTitleChatIds } = mergePendingChatSessions(
    query.data ?? [],
    pendingQuery.data ?? []
  );

  return {
    sessions,
    generatingTitleChatIds,
    isLoading: query.isPending && query.fetchStatus !== "idle",
    organizationId,
    queryKey,
  };
}

export function useChatSessionMutations() {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const { projectId, isResolved } = useActiveProject();
  const queryKey = chatSessionsQueryKey(organizationId, projectId);
  const pendingQueryKey = chatSessionsPendingQueryKey(
    organizationId,
    projectId
  );
  const renameInFlightRef = useRef<Set<string>>(new Set());

  function insertPendingChatSession(chatId: string) {
    if (!organizationId || !isResolved) {
      return;
    }

    const existing =
      queryClient.getQueryData<ChatSessionSummary[]>(queryKey) ?? [];
    if (existing.some((item) => item.chatId === chatId)) {
      return;
    }

    queryClient.setQueryData<ChatSessionSummary[]>(
      pendingQueryKey,
      (current = []) => {
        if (current.some((item) => item.chatId === chatId)) {
          return current;
        }
        return [createPendingChatSession(chatId), ...current];
      }
    );
  }

  function removePendingChatSession(chatId: string) {
    queryClient.setQueryData<ChatSessionSummary[]>(
      pendingQueryKey,
      (current = []) => current.filter((item) => item.chatId !== chatId)
    );
  }

  function replaceSessionInCache(
    chatId: string,
    updater: (session: ChatSessionSummary) => ChatSessionSummary
  ) {
    queryClient.setQueryData<ChatSessionSummary[]>(queryKey, (current = []) =>
      sortChatSessions(
        current.map((item) => (item.chatId === chatId ? updater(item) : item))
      )
    );
  }

  async function renameChat(
    chatId: string,
    nextTitle: string
  ): Promise<boolean> {
    if (
      !organizationId ||
      !isResolved ||
      renameInFlightRef.current.has(chatId)
    ) {
      return false;
    }

    renameInFlightRef.current.add(chatId);
    const previousSessions =
      queryClient.getQueryData<ChatSessionSummary[]>(queryKey) ?? [];
    replaceSessionInCache(chatId, (item) => ({ ...item, title: nextTitle }));

    try {
      const response = await fetch(chatSessionPath(organizationId, chatId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        queryClient.setQueryData(queryKey, previousSessions);
        toast.error("Failed to rename chat");
        renameInFlightRef.current.delete(chatId);
        return false;
      }

      const parsed = chatSessionResponseSchema.safeParse(await response.json());
      if (parsed.success && parsed.data.session) {
        const updated = parsed.data.session;
        replaceSessionInCache(chatId, () => updated);
      }
      renameInFlightRef.current.delete(chatId);
      return true;
    } catch {
      queryClient.setQueryData(queryKey, previousSessions);
      toast.error("Failed to rename chat");
      renameInFlightRef.current.delete(chatId);
      return false;
    }
  }

  async function togglePinned(session: ChatSessionSummary): Promise<boolean> {
    if (!organizationId || !isResolved) {
      return false;
    }

    const nextPinned = !session.pinnedAt;
    const previousSessions =
      queryClient.getQueryData<ChatSessionSummary[]>(queryKey) ?? [];
    const nextPinnedAt = nextPinned ? new Date().toISOString() : null;

    replaceSessionInCache(session.chatId, (item) => ({
      ...item,
      pinnedAt: nextPinnedAt,
    }));

    try {
      const response = await fetch(
        chatSessionPath(organizationId, session.chatId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: nextPinned }),
        }
      );

      if (!response.ok) {
        queryClient.setQueryData(queryKey, previousSessions);
        toast.error("Failed to update chat pin");
        return false;
      }

      const parsed = chatSessionResponseSchema.safeParse(await response.json());
      if (parsed.success && parsed.data.session) {
        const updated = parsed.data.session;
        replaceSessionInCache(session.chatId, () => updated);
      }
      return true;
    } catch {
      queryClient.setQueryData(queryKey, previousSessions);
      toast.error("Failed to update chat pin");
      return false;
    }
  }

  async function deleteChat(chatId: string): Promise<boolean> {
    if (!organizationId || !isResolved) {
      return false;
    }

    try {
      const response = await fetch(chatSessionPath(organizationId, chatId), {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("Failed to delete chat");
        return false;
      }

      queryClient.setQueryData<ChatSessionSummary[]>(queryKey, (current = []) =>
        current.filter((item) => item.chatId !== chatId)
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({
          queryKey: ["chat-history", organizationId, chatId],
        }),
      ]);

      toast.success("Chat deleted");
      return true;
    } catch {
      toast.error("Failed to delete chat");
      return false;
    }
  }

  return {
    insertPendingChatSession,
    removePendingChatSession,
    renameChat,
    togglePinned,
    deleteChat,
  };
}
