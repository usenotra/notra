"use client";

import { useChat } from "@ai-sdk/react";
import {
  chatSessionsListResponseSchema,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import type {
  ChatSessionSummary,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import {
  contentChatHistoryPath,
  contentChatHistoryQueryKey,
  contentChatSessionsPath,
  contentChatSessionsQueryKey,
} from "@notra/ai/utils/chat";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { ContentResponse } from "@notra/schemas/dashboard/content";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { ContentDetailChatComposerProps } from "@/components/content/content-detail-chat-shell";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { CONTENT_PLAN_CHAT_PLACEHOLDER } from "@/constants/content-plan";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import { collectContentChatToolOutputEffects } from "@/lib/content/apply-content-chat-tool-output";
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentChatMessageMetadata } from "@/types/content/chat";
import { handleStandaloneChatError } from "@/utils/chat-error";
import { snapshotContentChatAttachments } from "@/utils/content-chat-attachments";

interface UseContentDetailChatParams {
  organizationId: string;
  organizationSlug: string;
  contentId: string;
  content: ContentResponse | undefined;
  document: ContentDetailDocument;
}

export function useContentDetailChat({
  organizationId,
  organizationSlug,
  contentId,
  content,
  document,
}: UseContentDetailChatParams) {
  const { state: sidebarState } = useSidebar();
  const queryClient = useQueryClient();
  const { active, openPanel, closePanel } = useRightPanel();
  const isRightPanelOpen = active !== null;

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [context, setContext] = useState<ContextItem[]>([]);
  const [chatInputValue, setChatInputValue] = useState("");
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatIdToHydrate, setChatIdToHydrate] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const drainQueueRef = useRef<() => void>(() => {});
  const isDrainingRef = useRef(false);
  const wasStoppedByUserRef = useRef(false);
  const queuedMessagesRef = useRef<QueuedMessage[]>([]);
  const messagesRef = useRef<UIMessage[]>([]);
  const isAgentBusyRef = useRef(false);
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  const contentChatSessionsQuery = useQuery<ChatSessionSummary[]>({
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
  const contentChatSessions = contentChatSessionsQuery.data ?? [];
  const contentChatHistoryQuery = useQuery<UIMessage[] | null>({
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
    if (activeChatId || contentChatSessionsQuery.isPending) {
      return;
    }
    const latestChatId = contentChatSessionsQuery.data?.at(0)?.chatId;
    setActiveChatId(latestChatId ?? crypto.randomUUID());
    setChatIdToHydrate(latestChatId ?? null);
  }, [
    activeChatId,
    contentChatSessionsQuery.data,
    contentChatSessionsQuery.isPending,
  ]);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/organizations/${organizationId}/content/${contentId}/chat`,
    }),
    onFinish: () => {
      clearSelection();
      emitAutumnRefresh();
      if (activeChatId) {
        queryClient.setQueryData(
          contentChatHistoryQueryKey(organizationId, contentId, activeChatId),
          messagesRef.current
        );
      }
      queryClient
        .invalidateQueries({
          queryKey: contentChatSessionsQueryKey(organizationId, contentId),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh content chat sessions",
            invalidateError
          );
        });
      isDrainingRef.current = false;
      isAgentBusyRef.current = false;
      if (wasStoppedByUserRef.current) {
        wasStoppedByUserRef.current = false;
        return;
      }
      drainQueueRef.current();
    },
    onError: (err) => {
      isDrainingRef.current = false;
      isAgentBusyRef.current = false;
      queryClient
        .invalidateQueries({
          queryKey: contentChatSessionsQueryKey(organizationId, contentId),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh content chat sessions",
            invalidateError
          );
        });
      queryClient
        .invalidateQueries({
          queryKey: contentChatHistoryQueryKey(
            organizationId,
            contentId,
            activeChatId
          ),
        })
        .catch((invalidateError) => {
          console.error(
            "Failed to refresh content chat history",
            invalidateError
          );
        });

      const { isUsageLimit } = handleStandaloneChatError(err, {
        setChatError,
      });
      if (!isUsageLimit) {
        toast.error("Failed to edit content");
        drainQueueRef.current();
      }
    },
  });

  const isAgentBusy = status === "streaming" || status === "submitted";

  useLayoutEffect(() => {
    messagesRef.current = messages;
    isAgentBusyRef.current = isAgentBusy;
  }, [messages, isAgentBusy]);

  useLayoutEffect(() => {
    if (chatIdToHydrate !== activeChatId) {
      return;
    }
    if (status === "submitted" || status === "streaming") {
      return;
    }
    const history = contentChatHistoryQuery.data;
    if (!history) {
      return;
    }

    processedToolCallsRef.current.clear();
    for (const message of history) {
      for (const part of message.parts) {
        if ("toolCallId" in part && typeof part.toolCallId === "string") {
          processedToolCallsRef.current.add(part.toolCallId);
        }
      }
    }
    setMessages(history);
    setChatIdToHydrate(null);
  }, [
    activeChatId,
    chatIdToHydrate,
    contentChatHistoryQuery.data,
    setMessages,
    status,
  ]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAddContext = useCallback((item: ContextItem) => {
    setContext((prev) => {
      const exists = prev.some((c) => {
        if (c.type !== item.type) {
          return false;
        }
        if (c.type === "github-repo" && item.type === "github-repo") {
          return c.owner === item.owner && c.repo === item.repo;
        }
        return c.integrationId === item.integrationId;
      });
      if (exists) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const handleRemoveContext = useCallback((item: ContextItem) => {
    setContext((prev) =>
      prev.filter((c) => {
        if (c.type !== item.type) {
          return true;
        }
        if (c.type === "github-repo" && item.type === "github-repo") {
          return !(c.owner === item.owner && c.repo === item.repo);
        }
        return c.integrationId !== item.integrationId;
      })
    );
  }, []);

  const handleSelectionChange = useCallback((sel: TextSelection | null) => {
    if (sel && sel.text.length > 0) {
      setSelection(sel);
    }
  }, []);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (isAgentBusyRef.current || chatId === activeChatId) {
        return;
      }
      setQueuedMessages([]);
      queuedMessagesRef.current = [];
      processedToolCallsRef.current.clear();
      setMessages([]);
      setActiveChatId(chatId);
      setChatIdToHydrate(chatId);
    },
    [activeChatId, setMessages]
  );

  const handleNewChat = useCallback(() => {
    if (isAgentBusyRef.current) {
      return;
    }
    setQueuedMessages([]);
    queuedMessagesRef.current = [];
    setChatInputValue("");
    if (messagesRef.current.length === 0) {
      processedToolCallsRef.current.clear();
      return;
    }
    processedToolCallsRef.current.clear();
    setMessages([]);
    setActiveChatId(crypto.randomUUID());
    setChatIdToHydrate(null);
  }, [setMessages]);

  useEffect(() => {
    const effects = collectContentChatToolOutputEffects({
      messages,
      processedToolCalls: processedToolCallsRef.current,
      isGeoWriterPlanReviewableNow: document.isGeoWriterPlanReviewableNow,
      geoWriterDraftBriefId: document.geoWriterDraft?.briefId,
      geoWriterBriefData: document.geoWriterBriefQuery.data,
      editedMarkdownRef: document.editedMarkdownRef,
    });

    for (const effect of effects) {
      switch (effect.type) {
        case "track-image-revised":
          trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, { content_id: contentId });
          break;
        case "invalidate-content":
          document.invalidateContentQueries().catch((error) => {
            console.error("Failed to refresh edited content", error);
          });
          break;
        case "apply-image-markdown":
          document.setEditedMarkdown(effect.markdown);
          document.editedMarkdownRef.current = effect.markdown;
          document.editorRef.current?.setMarkdown(effect.markdown);
          trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, { content_id: contentId });
          break;
        case "apply-markdown-edit":
          document.setEditedMarkdown(effect.fixedMarkdown);
          document.editedMarkdownRef.current = effect.fixedMarkdown;
          if (effect.geoWriterPersist) {
            document.setReviewPreviousMarkdown(null);
            document.geoWriterUpdate.mutate(effect.geoWriterPersist, {
              onSuccess: () => {
                document.setOriginalMarkdown(effect.fixedMarkdown);
                document.originalMarkdownRef.current = effect.fixedMarkdown;
              },
            });
          } else {
            document.setReviewPreviousMarkdown(effect.reviewPrevious);
            document.setWriteFocusNonce((value) => value + 1);
            document.setEditorKey((key) => key + 1);
          }
          trackEvent(POSTHOG_EVENTS.CONTENT_AGENT_EDIT_APPLIED, {
            content_id: contentId,
            type: content?.contentType ?? null,
          });
          break;
        default:
          break;
      }
    }
  }, [content?.contentType, contentId, document, messages]);

  const dispatchContentEdit = useCallback(
    async (
      instruction: string,
      attachments: ContentChatMessageMetadata = {}
    ) => {
      if (!activeChatId) {
        return;
      }
      const nextSelection = attachments.selection;
      const nextContext = attachments.context ?? [];
      await sendMessage(
        {
          text: instruction,
          metadata: snapshotContentChatAttachments(
            nextSelection ?? null,
            nextContext
          ),
        },
        {
          body: {
            chatId: activeChatId,
            currentMarkdown:
              content?.contentType === "image"
                ? ""
                : (document.editedMarkdown ?? content?.markdown ?? ""),
            contentType: content?.contentType,
            documentMode: document.isGeoWriterPlanReviewableNow
              ? "plan"
              : undefined,
            selection: nextSelection,
            context: nextContext,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );
    },
    [
      sendMessage,
      activeChatId,
      content?.contentType,
      content?.markdown,
      document.editedMarkdown,
      document.isGeoWriterPlanReviewableNow,
    ]
  );

  const handleAiEdit = useCallback(
    async (instruction: string) => {
      openPanel("content");
      const attachments = snapshotContentChatAttachments(selection, context);
      if (isAgentBusyRef.current) {
        const next = [
          ...queuedMessagesRef.current,
          {
            id: nanoid(10),
            text: instruction,
            selection: attachments.selection,
            context: attachments.context,
          },
        ];
        queuedMessagesRef.current = next;
        setQueuedMessages(next);
        return;
      }
      wasStoppedByUserRef.current = false;
      isAgentBusyRef.current = true;
      await dispatchContentEdit(instruction, attachments);
    },
    [context, dispatchContentEdit, openPanel, selection]
  );

  const handleStop = useCallback(() => {
    wasStoppedByUserRef.current = true;
    stop();
  }, [stop]);

  const handleRemoveQueued = useCallback((id: string) => {
    const next = queuedMessagesRef.current.filter(
      (message) => message.id !== id
    );
    queuedMessagesRef.current = next;
    setQueuedMessages(next);
  }, []);

  const handleEditQueued = useCallback((message: QueuedMessage) => {
    const next = queuedMessagesRef.current.filter(
      (queued) => queued.id !== message.id
    );
    queuedMessagesRef.current = next;
    setQueuedMessages(next);
    setChatInputValue(message.text);
    if (message.selection) {
      setSelection(message.selection);
    }
    if (message.context?.length) {
      setContext(message.context);
    }
  }, []);

  const drainQueue = useCallback(() => {
    if (isDrainingRef.current) {
      return;
    }
    const queue = queuedMessagesRef.current;
    const next = queue[0];
    if (!next) {
      return;
    }

    isDrainingRef.current = true;
    queuedMessagesRef.current = queue.slice(1);
    setQueuedMessages(queue.slice(1));
    dispatchContentEdit(next.text, {
      selection: next.selection,
      context: next.context,
    }).catch((error) => {
      console.error("[Content] Failed to drain queued message:", error);
      isDrainingRef.current = false;
      const restored = [next, ...queuedMessagesRef.current];
      queuedMessagesRef.current = restored;
      setQueuedMessages(restored);
    });
  }, [dispatchContentEdit]);

  useLayoutEffect(() => {
    drainQueueRef.current = drainQueue;
  }, [drainQueue]);

  const isChatDisabled =
    document.isGeoWriterChatLocked ||
    !activeChatId ||
    contentChatSessionsQuery.isPending ||
    contentChatHistoryQuery.isFetching ||
    contentChatHistoryQuery.isError;

  const composerProps: ContentDetailChatComposerProps = {
    context,
    disabled: isChatDisabled,
    error: chatError,
    isLoading: isAgentBusy,
    onAddContext: handleAddContext,
    onClearError: () => setChatError(null),
    onClearSelection: clearSelection,
    onEditQueued: handleEditQueued,
    onRemoveContext: handleRemoveContext,
    onRemoveQueued: handleRemoveQueued,
    onSend: handleAiEdit,
    onStop: handleStop,
    onValueChange: setChatInputValue,
    organizationId,
    organizationSlug,
    placeholder: document.isGeoWriterPlanReviewableNow
      ? CONTENT_PLAN_CHAT_PLACEHOLDER
      : undefined,
    queuedMessages,
    selection,
    value: chatInputValue,
  };

  const floatingChatProps = {
    ...composerProps,
    sidebarOffsetClass:
      sidebarState === "collapsed" ? "md:left-14" : "md:left-64",
    hideOnLargeScreens: isRightPanelOpen,
  };

  const chatPanelProps = {
    activeChatId,
    isHistoryLoading:
      contentChatSessionsQuery.isPending || contentChatHistoryQuery.isFetching,
    messages,
    onClose: () => closePanel("content"),
    onNewChat: handleNewChat,
    onSelectChat: handleSelectChat,
    sessions: contentChatSessions,
    status,
    composer: composerProps,
  };

  return {
    chatPanelProps,
    floatingChatProps,
    handleSelectionChange,
  };
}
