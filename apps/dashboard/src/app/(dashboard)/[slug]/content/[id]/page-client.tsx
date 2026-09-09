"use client";

import { useChat } from "@ai-sdk/react";
import { SidebarRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContextItem, TextSelection } from "@notra/ai/types/chat";
import {
  contentChatHistoryQueryKey,
  contentChatSessionsQueryKey,
} from "@notra/ai/utils/chat";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Button } from "@notra/ui/components/ui/button";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import remend from "remend";
import { toast } from "sonner";

import ChatInput from "@/components/chat-input";
import type { QueuedMessage } from "@/components/chat/chat-queue";
import {
  ContentAgentPanel,
  ContentBackLink,
  ContentComposerDock,
  ContentSaveBar,
} from "@/components/content/content-agent-layout";
import { ContentDetailDocument } from "@/components/content/content-detail-document";
import { ContentDetailToolbar } from "@/components/content/content-detail-toolbar";
import { ContentEditorSwitch } from "@/components/content/editors";
import { RecommendationsSection } from "@/components/content/recommendations-section";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CONTENT_PLAN_CHAT_PLACEHOLDER } from "@/constants/content-plan";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import { useContentChatHistory } from "@/lib/hooks/use-content-chat-history";
import { useContentDocument } from "@/lib/hooks/use-content-document";
import { useContentPlan } from "@/lib/hooks/use-content-plan";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ContentChatMessageMetadata } from "@/types/content/chat";
import type { ContentDetailPageClientProps } from "@/types/content/detail";
import { getEditMarkdownDiff } from "@/utils/chat-document-diff";
import { handleStandaloneChatError } from "@/utils/chat-error";
import { snapshotContentChatAttachments } from "@/utils/content-chat-attachments";

import { useContent } from "../../../../../lib/hooks/use-content";
import { ContentDetailSkeleton } from "./skeleton";

export default function PageClient({
  contentId,
  organizationSlug,
  organizationId,
}: ContentDetailPageClientProps) {
  const { state: sidebarState } = useSidebar();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useContent(organizationId, contentId);
  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
  const { activeOrganization } = useOrganizationsContext();

  const chatHistory = useContentChatHistory({ organizationId, contentId });
  const { state: chatUi, dispatch: dispatchChatUi } = chatHistory;
  const documentController = useContentDocument({
    content: data?.content,
    contentId,
    organizationId,
  });
  const {
    draft: geoWriterDraft,
    briefQuery: geoWriterBriefQuery,
    update: geoWriterUpdate,
    isDirty: isPlanDirty,
    setIsDirty: setIsPlanDirty,
    hasConflict: hasPlanConflict,
    editorVersion: planEditorVersion,
    isWriting: isPlanWriting,
    isPlanMode: isGeoWriterPlanMode,
    isReviewable: isGeoWriterPlanReviewableNow,
    isChatLocked: isGeoWriterChatLocked,
    onBriefChange: handlePlanBriefChange,
    onArticleReady: handleGeoArticleReady,
    onLoadLatest: handleLoadLatestPlan,
    onSaveVersion: handleSavePlanVersion,
  } = useContentPlan({
    organizationId,
    contentId,
    sourceMetadata: data?.content?.sourceMetadata,
    replacePersistedMarkdown: documentController.replacePersistedMarkdown,
    resetForArticle: documentController.resetForArticle,
  });
  const {
    applyAgentEdit,
    clearReview,
    discard: handleDiscard,
    editedMarkdown,
    editedMarkdownRef,
    editorRef,
    editorVersion: editorKey,
    handleEditorChange,
    hasChanges,
    hasMarkdownChanges,
    hasSlugChanges,
    hasTitleChanges,
    isSaving,
    originalMarkdown,
    editingTitle,
    editingSlug,
    reviewPreviousMarkdown,
    save: handleSave,
    serverSlug,
    serverTitle,
    setEditedMarkdown,
    setEditingSlug,
    setEditingTitle,
    setOriginalMarkdown,
    writeFocusNonce,
  } = documentController;
  const {
    selection,
    context,
    input: chatInputValue,
    queuedMessages,
    activeChatId,
    chatIdToHydrate,
    error: chatError,
    isPanelOpen: isActivityPanelOpen,
    hasOpenedPanel: hasOpenedActivityPanel,
  } = chatUi;
  const saveToastIdRef = useRef<string | number | null>(null);
  const imageExportRef = useRef<HTMLDivElement | null>(null);
  const handleSaveRef = useRef<(() => void) | null>(null);
  const handleDiscardRef = useRef<(() => void) | null>(null);
  const hasTrackedOpenRef = useRef(false);

  useEffect(() => {
    const loadedContent = data?.content;
    if (!loadedContent || hasTrackedOpenRef.current) {
      return;
    }
    hasTrackedOpenRef.current = true;
    trackEvent(POSTHOG_EVENTS.CONTENT_OPENED, {
      content_id: contentId,
      type: loadedContent.contentType,
      status: loadedContent.status,
      from_geo_writer: Boolean(geoWriterDraft),
    });
  }, [contentId, data?.content, geoWriterDraft]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleDiscardRef.current = handleDiscard;
  }, [handleSave, handleDiscard]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 64rem)");

    const syncSaveToast = () => {
      const isWide = isActivityPanelOpen && mediaQuery.matches;

      if ((!hasChanges || isWide) && saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
        saveToastIdRef.current = null;
      }

      if (hasChanges && !isSaving && !isWide && !saveToastIdRef.current) {
        saveToastIdRef.current = toast.custom(
          (t) => (
            <div
              className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm"
              data-save-bar
            >
              <div className="bg-background flex items-center gap-3 rounded-lg px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Unsaved changes
                </span>
                <Button
                  onClick={() => {
                    toast.dismiss(t);
                    saveToastIdRef.current = null;
                    handleDiscardRef.current?.();
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Discard
                </Button>
                <Button
                  onClick={() => {
                    toast.dismiss(t);
                    saveToastIdRef.current = null;
                    handleSaveRef.current?.();
                  }}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          ),
          { duration: Number.POSITIVE_INFINITY, position: "bottom-right" }
        );
      }
    };

    syncSaveToast();
    mediaQuery.addEventListener("change", syncSaveToast);

    return () => {
      mediaQuery.removeEventListener("change", syncSaveToast);
    };
  }, [hasChanges, isSaving, isActivityPanelOpen]);

  useEffect(() => {
    return () => {
      if (saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
      }
    };
  }, []);

  const clearSelection = useCallback(() => {
    dispatchChatUi({ type: "selectionChanged", selection: null });
    window.getSelection()?.removeAllRanges();
  }, [dispatchChatUi]);

  const handleAddContext = useCallback(
    (item: ContextItem) => {
      dispatchChatUi({ type: "contextAdded", item });
    },
    [dispatchChatUi]
  );

  const handleRemoveContext = useCallback(
    (item: ContextItem) => {
      dispatchChatUi({ type: "contextRemoved", item });
    },
    [dispatchChatUi]
  );

  const handleSelectionChange = useCallback(
    (sel: TextSelection | null) => {
      if (sel && sel.text.length > 0) {
        dispatchChatUi({ type: "selectionChanged", selection: sel });
      }
    },
    [dispatchChatUi]
  );

  const drainQueueRef = useRef<() => void>(() => {
    // Populated after dispatchContentEdit is defined below.
  });
  const isDrainingRef = useRef(false);
  const wasStoppedByUserRef = useRef(false);
  const queuedMessagesRef = useRef<QueuedMessage[]>([]);
  const messagesRef = useRef<UIMessage[]>([]);
  const isAgentBusyRef = useRef(false);
  const processedToolCallsRef = useRef<Set<string>>(new Set());

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
        setChatError: (chatError) =>
          dispatchChatUi({ type: "errorChanged", error: chatError }),
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
    const history = chatHistory.history;
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
    dispatchChatUi({ type: "historyHydrated" });
  }, [
    activeChatId,
    chatIdToHydrate,
    chatHistory.history,
    dispatchChatUi,
    setMessages,
    status,
  ]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (isAgentBusyRef.current || chatId === activeChatId) {
        return;
      }
      queuedMessagesRef.current = [];
      processedToolCallsRef.current.clear();
      setMessages([]);
      dispatchChatUi({ type: "chatSelected", chatId });
    },
    [activeChatId, dispatchChatUi, setMessages]
  );

  const handleNewChat = useCallback(() => {
    if (isAgentBusyRef.current) {
      return;
    }
    queuedMessagesRef.current = [];
    processedToolCallsRef.current.clear();
    setMessages([]);
    dispatchChatUi({ type: "newChatStarted", chatId: crypto.randomUUID() });
  }, [dispatchChatUi, setMessages]);

  const invalidateContentQueries = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.list.key(),
        }),
      ]),
    [contentId, organizationId, queryClient]
  );

  useEffect(() => {
    let lastAssistantMessage: (typeof messages)[number] | undefined;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant") {
        lastAssistantMessage = message;
        break;
      }
    }
    if (!lastAssistantMessage?.parts) {
      return;
    }

    for (const part of lastAssistantMessage.parts) {
      if (
        part.type !== "tool-editMarkdown" &&
        part.type !== "tool-reviseImage"
      ) {
        continue;
      }

      const toolPart = part as {
        toolCallId: string;
        state: string;
        output?: {
          markdown?: string;
          status?: string;
          updatedMarkdown?: string;
        };
      };

      if (processedToolCallsRef.current.has(toolPart.toolCallId)) {
        continue;
      }

      if (
        part.type === "tool-reviseImage" &&
        toolPart.state === "output-available" &&
        toolPart.output?.status === "updated"
      ) {
        processedToolCallsRef.current.add(toolPart.toolCallId);
        trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, { content_id: contentId });
        invalidateContentQueries().catch((error) => {
          console.error("Failed to refresh revised image content", error);
        });
        continue;
      }

      if (
        toolPart.state === "output-available" &&
        (toolPart.output?.updatedMarkdown || toolPart.output?.markdown)
      ) {
        processedToolCallsRef.current.add(toolPart.toolCallId);
        const nextMarkdown =
          toolPart.output.updatedMarkdown || toolPart.output.markdown;
        if (!nextMarkdown) {
          continue;
        }
        const previousMarkdown =
          getEditMarkdownDiff(toolPart.output)?.previousMarkdown ??
          editedMarkdownRef.current ??
          "";
        const fixedMarkdown =
          part.type === "tool-reviseImage"
            ? nextMarkdown
            : remend(nextMarkdown);
        const reviewPrevious =
          part.type === "tool-editMarkdown" && previousMarkdown
            ? remend(previousMarkdown)
            : previousMarkdown;
        setEditedMarkdown(fixedMarkdown);
        if (part.type === "tool-editMarkdown") {
          if (
            isGeoWriterPlanReviewableNow &&
            geoWriterDraft?.briefId &&
            geoWriterBriefQuery.data
          ) {
            clearReview();
            geoWriterUpdate.mutate(
              {
                briefId: geoWriterDraft.briefId,
                expectedUpdatedAt: geoWriterBriefQuery.data.updatedAt,
                markdown: fixedMarkdown,
                workingTitle: geoWriterBriefQuery.data?.brief.workingTitle,
              },
              {
                onSuccess: () => {
                  setOriginalMarkdown(fixedMarkdown);
                },
              }
            );
          } else {
            applyAgentEdit(
              fixedMarkdown,
              reviewPrevious && reviewPrevious !== fixedMarkdown
                ? reviewPrevious
                : null
            );
          }
          trackEvent(POSTHOG_EVENTS.CONTENT_AGENT_EDIT_APPLIED, {
            content_id: contentId,
            type: data?.content?.contentType ?? null,
          });
        } else {
          editorRef.current?.setMarkdown(fixedMarkdown);
          trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, { content_id: contentId });
        }
        invalidateContentQueries().catch((error) => {
          console.error("Failed to refresh edited content", error);
        });
      }
    }
  }, [
    contentId,
    data?.content?.contentType,
    geoWriterBriefQuery.data,
    geoWriterDraft?.briefId,
    geoWriterUpdate,
    invalidateContentQueries,
    isGeoWriterPlanReviewableNow,
    applyAgentEdit,
    clearReview,
    editedMarkdownRef,
    editorRef,
    setOriginalMarkdown,
    messages,
    setEditedMarkdown,
  ]);

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
              data?.content?.contentType === "image"
                ? ""
                : (editedMarkdown ?? data?.content?.markdown ?? ""),
            contentType: data?.content?.contentType,
            documentMode: isGeoWriterPlanReviewableNow ? "plan" : undefined,
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
      data?.content?.contentType,
      editedMarkdown,
      data?.content?.markdown,
      isGeoWriterPlanReviewableNow,
    ]
  );

  const handleAiEdit = useCallback(
    async (instruction: string) => {
      dispatchChatUi({ type: "panelOpened" });
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
        dispatchChatUi({ type: "queueChanged", messages: next });
        return;
      }
      wasStoppedByUserRef.current = false;
      isAgentBusyRef.current = true;
      await dispatchContentEdit(instruction, attachments);
    },
    [context, dispatchChatUi, dispatchContentEdit, selection]
  );

  const handleStop = useCallback(() => {
    wasStoppedByUserRef.current = true;
    stop();
  }, [stop]);

  const handleRemoveQueued = useCallback(
    (id: string) => {
      const next = queuedMessagesRef.current.filter(
        (message) => message.id !== id
      );
      queuedMessagesRef.current = next;
      dispatchChatUi({ type: "queueChanged", messages: next });
    },
    [dispatchChatUi]
  );

  const handleEditQueued = useCallback(
    (message: QueuedMessage) => {
      const next = queuedMessagesRef.current.filter(
        (queued) => queued.id !== message.id
      );
      queuedMessagesRef.current = next;
      dispatchChatUi({ type: "queuedMessageEdited", message });
    },
    [dispatchChatUi]
  );

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
    dispatchChatUi({ type: "queueChanged", messages: queue.slice(1) });
    dispatchContentEdit(next.text, {
      selection: next.selection,
      context: next.context,
    }).catch((error) => {
      console.error("[Content] Failed to drain queued message:", error);
      isDrainingRef.current = false;
      const restored = [next, ...queuedMessagesRef.current];
      queuedMessagesRef.current = restored;
      dispatchChatUi({ type: "queueChanged", messages: restored });
    });
  }, [dispatchChatUi, dispatchContentEdit]);

  useLayoutEffect(() => {
    drainQueueRef.current = drainQueue;
  }, [drainQueue]);

  const isChatDisabled = isGeoWriterChatLocked || chatHistory.isUnavailable;

  const renderChatComposer = () => (
    <>
      <ChatInput
        context={context}
        disabled={isChatDisabled}
        error={chatError}
        isLoading={isAgentBusy}
        onAddContext={handleAddContext}
        onClearError={() =>
          dispatchChatUi({ type: "errorChanged", error: null })
        }
        onClearSelection={clearSelection}
        onEditQueued={handleEditQueued}
        onRemoveContext={handleRemoveContext}
        onRemoveQueued={handleRemoveQueued}
        onSend={handleAiEdit}
        onStop={handleStop}
        onValueChange={(input) =>
          dispatchChatUi({ type: "inputChanged", input })
        }
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        placeholder={
          isGeoWriterPlanReviewableNow
            ? CONTENT_PLAN_CHAT_PLACEHOLDER
            : undefined
        }
        queuedMessages={queuedMessages}
        selection={selection}
        value={chatInputValue}
      />
    </>
  );

  const chatInputSection = (
    <ContentComposerDock
      isPanelOpen={isActivityPanelOpen}
      sidebarState={sidebarState}
    >
      {renderChatComposer()}
    </ContentComposerDock>
  );

  if (isPending) {
    return (
      <>
        <ContentDetailSkeleton />
        {chatInputSection}
      </>
    );
  }

  if (error || !data?.content) {
    return (
      <>
        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
            <div className="rounded-xl border border-dashed p-12 text-center">
              <h3 className="text-lg font-medium">Content not found</h3>
              <p className="text-muted-foreground text-sm">
                This content may have been deleted or you don't have access to
                it.
              </p>
              <Link
                className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                href={`/${organizationSlug}/content`}
              >
                <Button className="mt-4" tabIndex={-1} variant="outline">
                  Back to Content
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {chatInputSection}
      </>
    );
  }

  const content = data.content;
  const planBrief = geoWriterBriefQuery.data?.brief;
  const editor = (
    <ContentEditorSwitch
      actions={{
        setEditedMarkdown,
        setOriginalMarkdown,
        setEditingTitle,
        setEditingSlug,
        onEditorChange: handleEditorChange,
        onSelectionChange: handleSelectionChange,
      }}
      content={{
        id: content.id,
        title: content.title,
        slug: content.slug,
        content: content.content,
        htmlUrl: content.htmlUrl,
        rawHtml: content.rawHtml,
        markdown: content.markdown,
        contentType: content.contentType,
        date: content.date,
        status: content.status,
        sourceMetadata: content.sourceMetadata,
      }}
      contentType={content.contentType}
      editorKey={editorKey}
      editorRef={editorRef}
      imageExportRef={imageExportRef}
      organization={{
        name: activeOrganization?.name ?? "Your Organization",
        logo: activeOrganization?.logo ?? null,
      }}
      organizationId={organizationId}
      readOnly={false}
      reviewPreviousMarkdown={reviewPreviousMarkdown}
      state={{
        editedMarkdown,
        originalMarkdown,
        editingTitle,
        serverTitle,
        editingSlug,
        serverSlug,
        hasChanges,
        hasMarkdownChanges,
        hasTitleChanges,
        hasSlugChanges,
      }}
      writeFocusNonce={writeFocusNonce}
    />
  );
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <ContentBackLink
              organizationSlug={organizationSlug}
              collectionId={data.collection?.id}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="hidden lg:inline-flex"
                    onClick={() => dispatchChatUi({ type: "panelToggled" })}
                    size="icon-sm"
                    variant={isActivityPanelOpen ? "secondary" : "outline"}
                  />
                }
              >
                <span className="sr-only">Toggle Content Agent</span>
                <HugeiconsIcon className="size-4" icon={SidebarRight01Icon} />
              </TooltipTrigger>
              <TooltipContent>Content Agent</TooltipContent>
            </Tooltip>
          </div>
          <WriterExecute.Root
            briefId={geoWriterDraft?.briefId ?? null}
            hasUnsavedChanges={
              isGeoWriterPlanMode
                ? isPlanDirty || geoWriterUpdate.isPending
                : hasChanges
            }
            onArticleReady={handleGeoArticleReady}
            organizationId={organizationId}
            projectId={geoWriterDraft?.projectId}
          >
            {geoWriterDraft ? <WriterExecute.Banner /> : null}
            <ContentDetailToolbar
              content={content}
              document={documentController}
              imageExportRef={imageExportRef}
              isPlanMode={isGeoWriterPlanMode}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              voices={brandResponse?.voices ?? []}
            />
          </WriterExecute.Root>

          <ContentDetailDocument
            editor={editor}
            isPlanMode={isGeoWriterPlanMode}
            plan={{
              brief: planBrief,
              briefId: geoWriterDraft?.briefId,
              contentId,
              editorVersion: planEditorVersion,
              hasConflict: hasPlanConflict,
              isReviewable: isGeoWriterPlanReviewableNow,
              isWriting: isPlanWriting,
              onBriefChange: handlePlanBriefChange,
              onDirtyChange: setIsPlanDirty,
              onLoadLatest: handleLoadLatestPlan,
              onSaveVersion: handleSavePlanVersion,
            }}
          />

          {isGeoWriterPlanMode ? null : (
            <RecommendationsSection value={content.recommendations} />
          )}

          <div className="h-24" />
        </div>
      </div>
      <ContentAgentPanel
        isOpen={isActivityPanelOpen}
        hasOpened={hasOpenedActivityPanel}
        activeChatId={activeChatId}
        isHistoryLoading={chatHistory.isHistoryLoading}
        messages={messages}
        onClose={() => dispatchChatUi({ type: "panelClosed" })}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        sessions={chatHistory.sessions}
        status={status}
      >
        {renderChatComposer()}
      </ContentAgentPanel>
      <ContentSaveBar
        hasChanges={hasChanges}
        isPanelOpen={isActivityPanelOpen}
        sidebarState={sidebarState}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
      {chatInputSection}
    </>
  );
}
