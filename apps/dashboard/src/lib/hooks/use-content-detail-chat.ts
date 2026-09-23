"use client";

import { useChat } from "@ai-sdk/react";
import {
  chatSessionsListResponseSchema,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import type {
  ChatAttachment,
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
import type { ContentResponse } from "@notra/schemas/dashboard/content";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
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
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import {
  applyContentChatToolOutputEffect,
  collectContentChatToolOutputEffects,
} from "@/lib/content/apply-content-chat-tool-output";
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentChatMessageMetadata } from "@/types/content/chat";
import { isTerminalToolState } from "@/utils/chat-approvals";
import { handleStandaloneChatError } from "@/utils/chat-error";
import { buildUserMessageParts } from "@/utils/chat-message-parts";
import {
  shouldDrainQueueAfterError,
  takeQueuedMessage,
} from "@/utils/chat-queue";
import { snapshotContentChatAttachments } from "@/utils/content-chat-attachments";

interface UseContentDetailChatParams {
  organizationId: string;
  organizationSlug: string;
  contentId: string;
  content: ContentResponse | undefined;
  contentDocument: ContentDetailDocument;
}

export function useContentDetailChat({
  organizationId,
  organizationSlug,
  contentId,
  content,
  contentDocument,
}: UseContentDetailChatParams) {
  const {
    editedMarkdown,
    editedMarkdownRef,
    editorRef,
    geoWriterBriefQuery,
    geoWriterDraft,
    geoWriterUpdate,
    invalidateContentQueries,
    isGeoWriterChatLocked,
    isGeoWriterPlanReviewableNow,
    originalMarkdownRef,
    setEditedMarkdown,
    setEditorKey,
    setOriginalMarkdown,
    setReviewPreviousMarkdown,
    setWriteFocusNonce,
  } = contentDocument;
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
  const flushSteerAfterStopRef = useRef<() => void>(() => {});
  const isDrainingRef = useRef(false);
  const wasStoppedByUserRef = useRef(false);
  const queuedMessagesRef = useRef<QueuedMessage[]>([]);
  const steerAfterStopRef = useRef<QueuedMessage | null>(null);
  const steerInFlightRef = useRef<QueuedMessage | null>(null);
  const skipQueueDrainRef = useRef(false);
  const messagesRef = useRef<UIMessage[]>([]);
  const isAgentBusyRef = useRef(false);
  const seenToolOutputsRef = useRef<Set<string>>(new Set());
  const prevIsAgentBusyRef = useRef(false);
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const contentScopeKey = `${organizationId}:${contentId}`;
  const contentScopeRef = useRef(contentScopeKey);

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

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: `content-detail-${contentScopeKey}`,
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
      steerInFlightRef.current = null;
      skipQueueDrainRef.current = false;
      if (steerAfterStopRef.current) {
        flushSteerAfterStopRef.current();
        return;
      }
      if (wasStoppedByUserRef.current) {
        wasStoppedByUserRef.current = false;
        return;
      }
      drainQueueRef.current();
    },
    onError: (err) => {
      isDrainingRef.current = false;
      isAgentBusyRef.current = false;
      if (steerAfterStopRef.current) {
        flushSteerAfterStopRef.current();
        return;
      }
      const steered = steerInFlightRef.current;
      const skipQueueDrain = skipQueueDrainRef.current || Boolean(steered);
      if (steered) {
        steerInFlightRef.current = null;
        const restored = [steered, ...queuedMessagesRef.current];
        queuedMessagesRef.current = restored;
        setQueuedMessages(restored);
      }
      skipQueueDrainRef.current = false;
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
      }
      if (
        shouldDrainQueueAfterError({
          hasPendingSteer: false,
          hasSteerInFlight: skipQueueDrain,
          isUsageLimit,
        })
      ) {
        drainQueueRef.current();
      }
    },
  });

  const isAgentBusy = status === "streaming" || status === "submitted";

  useLayoutEffect(() => {
    if (contentScopeRef.current === contentScopeKey) {
      return;
    }
    contentScopeRef.current = contentScopeKey;

    stop();
    setActiveChatId(null);
    setChatIdToHydrate(null);
    setSelection(null);
    setContext([]);
    setChatInputValue("");
    setQueuedMessages([]);
    queuedMessagesRef.current = [];
    steerAfterStopRef.current = null;
    steerInFlightRef.current = null;
    skipQueueDrainRef.current = false;
    setChatError(null);
    processedToolCallsRef.current = new Set();
    wasStoppedByUserRef.current = false;
    isDrainingRef.current = false;
    isAgentBusyRef.current = false;
    setMessages([]);
  }, [contentScopeKey, setMessages, stop]);

  useEffect(() => {
    if (activeChatId || contentChatSessionsQuery.isPending) {
      return;
    }
    const latestChatId = contentChatSessionsQuery.data?.at(0)?.chatId;
    setActiveChatId(latestChatId ?? crypto.randomUUID());
    setChatIdToHydrate(latestChatId ?? null);
  }, [
    activeChatId,
    contentId,
    contentChatSessionsQuery.data,
    contentChatSessionsQuery.isPending,
    organizationId,
  ]);

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

    const nextProcessedToolCalls = new Set<string>();
    for (const message of history) {
      for (const part of message.parts) {
        if ("toolCallId" in part && typeof part.toolCallId === "string") {
          nextProcessedToolCalls.add(part.toolCallId);
        }
      }
    }
    processedToolCallsRef.current = nextProcessedToolCalls;
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
    // Attaching follows the editor selection in both directions: selecting adds
    // the excerpt as context, deselecting takes it away again.
    setSelection(sel && sel.text.length > 0 ? sel : null);
  }, []);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (isAgentBusyRef.current || chatId === activeChatId) {
        return;
      }
      setQueuedMessages([]);
      queuedMessagesRef.current = [];
      steerAfterStopRef.current = null;
      steerInFlightRef.current = null;
      skipQueueDrainRef.current = false;
      processedToolCallsRef.current = new Set();
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
    steerAfterStopRef.current = null;
    steerInFlightRef.current = null;
    skipQueueDrainRef.current = false;
    setChatInputValue("");
    if (messagesRef.current.length === 0) {
      processedToolCallsRef.current = new Set();
      return;
    }
    processedToolCallsRef.current = new Set();
    setMessages([]);
    setActiveChatId(crypto.randomUUID());
    setChatIdToHydrate(null);
  }, [setMessages]);

  useEffect(() => {
    const processedToolCalls = processedToolCallsRef.current;
    const effects = collectContentChatToolOutputEffects({
      messages,
      processedToolCalls,
      isGeoWriterPlanReviewableNow,
      geoWriterDraftBriefId: geoWriterDraft?.briefId,
      geoWriterBriefData: geoWriterBriefQuery.data,
      editedMarkdown,
    });

    if (effects.length === 0) {
      return;
    }

    const nextProcessedToolCalls = new Set(processedToolCalls);
    for (const effect of effects) {
      applyContentChatToolOutputEffect(effect, {
        contentId,
        contentType: content?.contentType,
        editedMarkdownRef,
        editorRef,
        geoWriterUpdate,
        invalidateContentQueries,
        originalMarkdownRef,
        setEditedMarkdown,
        setEditorKey,
        setOriginalMarkdown,
        setReviewPreviousMarkdown,
        setWriteFocusNonce,
      });
      nextProcessedToolCalls.add(effect.toolCallId);
    }
    processedToolCallsRef.current = nextProcessedToolCalls;
  }, [
    content?.contentType,
    contentId,
    editedMarkdown,
    editedMarkdownRef,
    editorRef,
    geoWriterBriefQuery.data,
    geoWriterDraft?.briefId,
    geoWriterUpdate,
    invalidateContentQueries,
    isGeoWriterPlanReviewableNow,
    messages,
    originalMarkdownRef,
    setEditedMarkdown,
    setEditorKey,
    setOriginalMarkdown,
    setReviewPreviousMarkdown,
    setWriteFocusNonce,
  ]);

  const dispatchContentEdit = useCallback(
    async (
      instruction: string,
      attachments: ContentChatMessageMetadata = {},
      files: ChatAttachment[] = []
    ) => {
      if (!activeChatId) {
        return;
      }
      const nextSelection = attachments.selection;
      const nextContext = attachments.context ?? [];
      const metadata = snapshotContentChatAttachments(
        nextSelection ?? null,
        nextContext
      );
      const requestBody = {
        chatId: activeChatId,
        currentMarkdown:
          content?.contentType === "image"
            ? ""
            : (editedMarkdown ?? content?.markdown ?? ""),
        contentType: content?.contentType,
        documentMode: isGeoWriterPlanReviewableNow ? "plan" : undefined,
        selection: nextSelection,
        context: nextContext,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      if (files.length > 0) {
        const parts = buildUserMessageParts(instruction, files);
        await sendMessage(
          {
            role: "user",
            parts,
            metadata,
          },
          { body: requestBody }
        );
        return;
      }
      await sendMessage(
        {
          text: instruction,
          metadata,
        },
        { body: requestBody }
      );
    },
    [
      sendMessage,
      activeChatId,
      content?.contentType,
      content?.markdown,
      editedMarkdown,
      isGeoWriterPlanReviewableNow,
    ]
  );

  const handleAiEdit = useCallback(
    async (instruction: string, files: ChatAttachment[] = []) => {
      openPanel("content");
      const attachments = snapshotContentChatAttachments(selection, context);
      if (isAgentBusyRef.current) {
        if (files.length > 0) {
          return;
        }
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
      await dispatchContentEdit(instruction, attachments, files);
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

  const restoreSteeredMessage = useCallback(() => {
    const next = steerInFlightRef.current;
    if (!next) {
      return;
    }
    steerInFlightRef.current = null;
    isAgentBusyRef.current = false;
    const restored = [next, ...queuedMessagesRef.current];
    queuedMessagesRef.current = restored;
    setQueuedMessages(restored);
  }, []);

  const sendSteeredMessage = useCallback(
    (message: QueuedMessage) => {
      steerInFlightRef.current = message;
      skipQueueDrainRef.current = true;
      wasStoppedByUserRef.current = false;
      isAgentBusyRef.current = true;
      dispatchContentEdit(message.text, {
        selection: message.selection,
        context: message.context,
      }).catch((error) => {
        console.error("[Content] Failed to steer queued message:", error);
        restoreSteeredMessage();
      });
    },
    [dispatchContentEdit, restoreSteeredMessage]
  );

  const flushSteerAfterStop = useCallback(() => {
    const next = steerAfterStopRef.current;
    if (!next) {
      return;
    }
    steerAfterStopRef.current = null;
    sendSteeredMessage(next);
  }, [sendSteeredMessage]);

  const handleSteerQueued = useCallback(
    (message: QueuedMessage) => {
      const taken = takeQueuedMessage(queuedMessagesRef.current, message.id);
      if (!taken) {
        return;
      }
      queuedMessagesRef.current = taken.remaining;
      setQueuedMessages(taken.remaining);
      if (!isAgentBusyRef.current) {
        sendSteeredMessage(taken.message);
        return;
      }
      steerAfterStopRef.current = taken.message;
      wasStoppedByUserRef.current = false;
      stop();
    },
    [sendSteeredMessage, stop]
  );

  const drainQueue = useCallback(() => {
    if (
      isDrainingRef.current ||
      steerAfterStopRef.current ||
      steerInFlightRef.current ||
      skipQueueDrainRef.current
    ) {
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

  useLayoutEffect(() => {
    flushSteerAfterStopRef.current = flushSteerAfterStop;
  }, [flushSteerAfterStop]);

  useEffect(() => {
    if (isAgentBusy && !prevIsAgentBusyRef.current) {
      const snapshot = new Set<string>();
      for (const message of messagesRef.current) {
        if (message.role !== "assistant") {
          continue;
        }
        for (const part of message.parts) {
          if (isToolUIPart(part) && isTerminalToolState(part.state)) {
            snapshot.add(part.toolCallId);
          }
        }
      }
      seenToolOutputsRef.current = snapshot;
      isDrainingRef.current = false;
    }
    prevIsAgentBusyRef.current = isAgentBusy;
  }, [isAgentBusy]);

  useEffect(() => {
    if (!isAgentBusy) {
      return;
    }
    if (isDrainingRef.current || wasStoppedByUserRef.current) {
      return;
    }
    if (queuedMessages.length === 0) {
      return;
    }

    let hasNewToolOutput = false;
    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts) {
        if (
          isToolUIPart(part) &&
          isTerminalToolState(part.state) &&
          !seenToolOutputsRef.current.has(part.toolCallId)
        ) {
          seenToolOutputsRef.current.add(part.toolCallId);
          hasNewToolOutput = true;
        }
      }
    }

    if (!hasNewToolOutput) {
      return;
    }

    isDrainingRef.current = true;
    stop();
  }, [isAgentBusy, messages, queuedMessages.length, stop]);

  const isChatDisabled =
    isGeoWriterChatLocked ||
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
    onSteerQueued: handleSteerQueued,
    onSend: handleAiEdit,
    onStop: handleStop,
    onValueChange: setChatInputValue,
    organizationId,
    organizationSlug,
    placeholder: isGeoWriterPlanReviewableNow
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
    selection,
  };
}
