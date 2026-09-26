"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowReloadHorizontalIcon, X } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { externalChannelIdSchema } from "@notra/ai/schemas/chat";
import type { ContentType } from "@notra/ai/schemas/content";
import { createdPostToolOutputSchema } from "@notra/ai/schemas/post";
import type {
  ChatAttachment,
  ChatInputHandle,
  ChatMessagePart,
  ChatUIMessage,
  ContextItem,
  ExternalChannelId,
  MirrorChatStatus,
} from "@notra/ai/types/chat";
import { linkSavedChatPosts } from "@notra/ai/utils/chat-post";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  MessageContent,
  MessageResponse,
} from "@notra/ui/components/ai-elements/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  type DynamicToolUIPart,
  getToolName,
  isToolUIPart,
  type ToolUIPart,
} from "ai";
import { LazyMotion, m, useReducedMotion } from "motion/react";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  Children,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ChatActivityStatus } from "@/components/ai/chat-activity-status";
import { ChatAssistantParts } from "@/components/ai/chat-assistant-parts";
import { ChatReasoningBlock } from "@/components/ai/chat-reasoning-block";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import { getMcpToolServerId } from "@/components/ai/chat-tool-block/mcp/utils";
import { AssistantMetadataHover } from "@/components/chat/assistant-metadata-hover";
import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import { ChatImageAttachment } from "@/components/chat/chat-image-attachment";
import {
  ChatInputAdvanced,
  type ThinkingLevel,
} from "@/components/chat/chat-input";
import type { QueuedMessage } from "@/components/chat/chat-queue";
import {
  ChatQuoteProvider,
  ChatQuoteMessage as Message,
} from "@/components/chat/chat-quote";
import { ChatScrollOnSend } from "@/components/chat/chat-scroll-on-send";
import { ChatSuggestions } from "@/components/chat/chat-suggestions";
import { renderTextWithIntegrationReferences } from "@/components/chat/integration-reference";
import { MessageAuthorAvatar } from "@/components/chat/message-author-avatar";
import { SlackRelayFooterNotice } from "@/components/chat/slack-relay-footer-notice";
import {
  UserMessageActions,
  UserMessageTextBubble,
} from "@/components/chat/user-message-actions";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CHAT_ACTIVE_STREAM_POLL_INTERVAL_MS } from "@/constants/chat-active-stream";
import { MAX_VISIBLE_CHAT_IMAGES } from "@/constants/chat-images";
import {
  AVAILABLE_MODELS,
  ZDR_AVAILABLE_MODELS,
} from "@/constants/chat-models";
import { TOOL_TIMER_THRESHOLD_SECONDS } from "@/constants/chat-tool-timer";
import { INTEGRATION_REFERENCE_TOKEN_SPLIT_REGEX } from "@/constants/integration-reference";
import { MIRROR_WORKING_TIMEOUT_MS } from "@/constants/slack-mirror";
import { localStorageKeys } from "@/constants/storage";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { getChatContextKind } from "@/lib/analytics/studio-events";
import { authClient } from "@/lib/auth/client";
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import {
  relaySlackApproval,
  relaySlackMirrorMessage,
} from "@/lib/chat/slack-relay";
import { createStandaloneChatTransport } from "@/lib/chat/standalone-chat-transport";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useChatActivityTimer } from "@/lib/hooks/use-chat-activity-timer";
import {
  reconcileCreatedChatTitle,
  useChatSessionMutations,
} from "@/lib/hooks/use-chat-sessions";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed-seconds";
import { useHasZdrEntitlement } from "@/lib/hooks/use-plan";
import { useSlackMirrorStream } from "@/lib/hooks/use-slack-mirror-stream";
import { getMcpIconUrls } from "@/lib/integrations/mcp";
import { dashboardOrpc } from "@/lib/orpc/query";
import { isImageMimeType } from "@/lib/upload/mime";
import { cn } from "@/lib/utils";
import type {
  ChatDraftAction,
  ChatToolApprovalDecision,
} from "@/types/analytics/studio-events";
import type { ChatMessageAuthor } from "@/types/chat";
import type {
  CreateToolContentType,
  StandaloneChatPageClientProps,
  UserImageGridProps,
} from "@/types/components/chat-page";
import type { PublishedSocialPost } from "@/types/content/post-social";
import { getChatActivity, hasVisibleChatContent } from "@/utils/chat-activity";
import {
  hasPendingApproval,
  isTerminalToolState,
  shouldContinueAfterApprovalResponse,
} from "@/utils/chat-approvals";
import { handleStandaloneChatError } from "@/utils/chat-error";
import {
  resolveChatMessageAuthor,
  shouldShowChatAuthorAvatars,
  toChatMessageAuthor,
} from "@/utils/chat-message-author";
import {
  CHAT_PREFERENCES_STORAGE_KEY,
  DEFAULT_CHAT_PREFERENCES,
  parseStoredChatModel,
  parseStoredThinkingLevel,
  readStoredChatPreferences,
  writeStoredChatPreferences,
} from "@/utils/chat-preferences";
import {
  markQueuedMessageSteering,
  parseQueuedMessages,
  takeQueuedMessage,
} from "@/utils/chat-queue";
import {
  clearPendingChatClientState,
  resetNewChatClientState,
  updateWasStoppedByUser,
} from "@/utils/chat-state";
import { isContentEditorStandaloneTool } from "@/utils/content-editor-standalone-tool";
import { formatLongDate, getGreeting } from "@/utils/dashboard-greeting";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";
import {
  getReferenceDisplay,
  parseReferenceValue,
} from "@/utils/integration-reference";
import { getOutputTypeLabel } from "@/utils/output-types";
import { buildPublishedChatMessage } from "@/utils/social-publish";

import { ChatPageSkeleton } from "./skeleton";

const BlogChangelogPreview = dynamic(
  () =>
    import("@/components/ai/blog-changelog-preview").then(
      (mod) => mod.BlogChangelogPreview
    ),
  { ssr: false }
);

const TwitterPreview = dynamic(
  () =>
    import("@/components/ai/twitter-preview").then((mod) => mod.TwitterPreview),
  { ssr: false }
);

const LinkedInPreview = dynamic(
  () =>
    import("@/components/ai/linkedin-preview").then(
      (mod) => mod.LinkedInPreview
    ),
  { ssr: false }
);

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

const emptySubscribe = () => () => {
  // no external store to subscribe to; used to detect hydration
};

function SlackMirrorNotice() {
  return (
    <div className="border-border bg-muted/40 text-muted-foreground rounded-lg border px-4 py-3 text-center text-sm">
      Mirrored from a Slack thread.
    </div>
  );
}

function CreateToolPendingIndicator({
  toolCallId,
}: Pick<RenderableToolPart, "toolCallId">) {
  const elapsedSeconds = useElapsedSeconds(true, toolCallId);

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>Working</span>
      {elapsedSeconds >= TOOL_TIMER_THRESHOLD_SECONDS && (
        <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums">
          {formatElapsedSeconds(elapsedSeconds)}
        </span>
      )}
    </div>
  );
}

function CompletedToolTimer({
  children,
  toolCallId,
}: Pick<RenderableToolPart, "toolCallId"> & { children?: ReactNode }) {
  useElapsedSeconds(false, toolCallId);
  return children ?? null;
}

const CREATE_TOOL_TYPES = {
  "tool-createBlogPost": "blog_post",
  "tool-createChangelog": "changelog",
  "tool-createInvestorUpdate": "investor_update",
  "tool-createLinkedInPost": "linkedin_post",
  "tool-createTwitterPost": "twitter_post",
} satisfies Record<string, ContentType>;

type RenderableToolPart = DynamicToolUIPart | ToolUIPart;

function isCreateTool(type: string): boolean {
  return type in CREATE_TOOL_TYPES;
}

function getCreateToolContentType(
  type: keyof typeof CREATE_TOOL_TYPES
): CreateToolContentType {
  return CREATE_TOOL_TYPES[type];
}

function hasSendableParts(message: ChatUIMessage): boolean {
  return Array.isArray(message.parts) && message.parts.length > 0;
}

function normalizeToolApprovalsForSend(
  messages: ChatUIMessage[]
): ChatUIMessage[] {
  return messages.map((message) => {
    if (!Array.isArray(message.parts)) {
      return message;
    }

    let changed = false;
    const parts = message.parts.map((part) => {
      if (
        isToolUIPart(part) &&
        part.state === "approval-responded" &&
        part.approval.approved === false &&
        (part.approval.reason === "discard" || part.approval.reason == null)
      ) {
        changed = true;
        return {
          ...part,
          approval: {
            ...part.approval,
            approved: false,
          },
          state: "output-denied" as const,
        } as ChatUIMessage["parts"][number];
      }

      return part;
    });

    return changed ? { ...message, parts } : message;
  }) as ChatUIMessage[];
}

function getSendableMessages(messages: ChatUIMessage[]): ChatUIMessage[] {
  return normalizeToolApprovalsForSend(messages).filter(hasSendableParts);
}

function UserImageGrid({ children }: UserImageGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const imageItems = Children.toArray(children) as ReactElement[];
  const hiddenImageCount = Math.max(
    imageItems.length - MAX_VISIBLE_CHAT_IMAGES,
    0
  );
  const visibleImageCount = isExpanded
    ? imageItems.length
    : imageItems.length - hiddenImageCount;

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-image-index="${MAX_VISIBLE_CHAT_IMAGES}"] button`
        )
        ?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isExpanded]);

  return (
    <m.div
      className="relative flex w-[28rem] max-w-full flex-wrap justify-end gap-1.5"
      layout={!reduceMotion}
      ref={gridRef}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {imageItems.slice(0, visibleImageCount).map((imageItem, index) => {
        const isCovered =
          !isExpanded &&
          hiddenImageCount > 0 &&
          index === MAX_VISIBLE_CHAT_IMAGES - 1;

        return (
          <m.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="aspect-square w-[calc((100%_-_0.75rem)/3)] [&_img]:size-full [&_img]:object-cover [&>*]:m-0 [&>*]:size-full"
            data-image-index={index}
            inert={isCovered ? true : undefined}
            initial={
              reduceMotion || index < MAX_VISIBLE_CHAT_IMAGES
                ? false
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            key={imageItem.key}
            layout={!reduceMotion}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {imageItem}
          </m.div>
        );
      })}
      {!isExpanded && hiddenImageCount > 0 && (
        <m.button
          animate={{ opacity: 1 }}
          aria-label={`Show ${hiddenImageCount} more ${hiddenImageCount === 1 ? "image" : "images"}`}
          className="focus-visible:ring-ring absolute right-0 bottom-0 z-10 flex aspect-square w-[calc((100%_-_0.75rem)/3)] items-center justify-center rounded-lg border border-white/15 bg-black/60 text-xl font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none"
          initial={reduceMotion ? false : { opacity: 0 }}
          onClick={() => setIsExpanded(true)}
          transition={
            reduceMotion ? { duration: 0 } : { delay: 0.1, duration: 0.2 }
          }
          type="button"
        >
          +{hiddenImageCount}
        </m.button>
      )}
    </m.div>
  );
}

function ProjectScopeLoadingInput() {
  return (
    <Skeleton
      aria-label="Loading project"
      className="bg-muted/50 h-24 rounded-xl"
      role="status"
    />
  );
}

function discardFailedNewChatFromSidebar({
  chatId,
  initialChatId,
  organizationId,
  queryClient,
  removePendingChatSession,
}: {
  chatId: string;
  initialChatId: string | undefined;
  organizationId: string;
  queryClient: QueryClient;
  removePendingChatSession: (chatId: string) => void;
}) {
  if (initialChatId) {
    return;
  }
  removePendingChatSession(chatId);
  queryClient.invalidateQueries({
    queryKey: ["chat-sessions", organizationId],
  });
}

// react-doctor-disable-next-line react-doctor/no-high-complexity-react-function -- standalone chat page predates the complexity cap; split in a dedicated refactor
function StandaloneChatPageClient({
  organizationSlug,
  chatId: initialChatId,
}: StandaloneChatPageClientProps) {
  const router = useRouter();
  const [initialQuery, setInitialQuery] = useQueryState(
    "q",
    parseAsString.withOptions({ history: "replace" })
  );
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";
  const { projectId: activeProjectId, isResolved: isProjectResolved } =
    useActiveProject();
  const { canUseNonZdr } = useHasZdrEntitlement();
  const availableModels = canUseNonZdr
    ? AVAILABLE_MODELS
    : ZDR_AVAILABLE_MODELS;
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const { insertPendingChatSession, removePendingChatSession } =
    useChatSessionMutations();
  const { data: membersData } = useQuery({
    queryKey: ["members", organizationId],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listMembers({
        query: { organizationId },
      });
      if (error) {
        throw new Error("Failed to fetch organization members");
      }
      return data;
    },
    enabled: Boolean(organizationId),
    staleTime: 1000 * 60 * 5,
  });
  const { data: customMcpData } = useQuery(
    dashboardOrpc.integrations.mcp.list.queryOptions({
      input: { organizationId },
      enabled: Boolean(organizationId),
    })
  );
  const { data: mcpStoreData } = useQuery(
    dashboardOrpc.integrations.mcp.storeList.queryOptions({
      input: { organizationId },
      enabled: Boolean(organizationId),
    })
  );
  const mcpLogosByConnectionId = useMemo(
    () =>
      new Map([
        ...(customMcpData?.servers ?? []).map(
          (server) =>
            [
              server.id,
              getMcpIconUrls({
                darkUrl: server.logoDarkUrl,
                lightUrl: server.logoLightUrl,
              }),
            ] as const
        ),
        ...(mcpStoreData?.integrations ?? []).flatMap((integration) =>
          integration.connection
            ? [
                [
                  integration.connection.id,
                  getMcpIconUrls({
                    darkUrl: integration.logoDarkUrl,
                    lightUrl: integration.logoLightUrl,
                  }),
                ] as const,
              ]
            : []
        ),
      ]),
    [customMcpData?.servers, mcpStoreData?.integrations]
  );
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [historyStreamId, setHistoryStreamId] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [generatedChatId, setGeneratedChatId] = useState(() =>
    crypto.randomUUID()
  );
  const stableChatId = initialChatId ?? generatedChatId;

  const [context, setContext] = useState<ContextItem[]>([]);
  const [hasCustomizedContext, setHasCustomizedContext] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    filename: string;
    mediaType: string;
  } | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    DEFAULT_CHAT_PREFERENCES.model
  );
  const effectiveSelectedModel =
    !canUseNonZdr &&
    (selectedModel === "openai/gpt-6-sol" ||
      selectedModel === "openai/gpt-6-luna")
      ? "auto"
      : selectedModel;
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(
    DEFAULT_CHAT_PREFERENCES.thinkingLevel
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageBranches, setMessageBranches] = useState<
    Record<string, { tails: ChatUIMessage[][]; active: number }>
  >({});
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const [isInputEmpty, setIsInputEmpty] = useState(true);
  const reduceMotion = useReducedMotion();

  const handleSuggestionSelect = useCallback((text: string) => {
    chatInputRef.current?.setText(text);
  }, []);

  const contextRef = useRef(context);
  const hasCustomizedContextRef = useRef(hasCustomizedContext);
  const organizationIdRef = useRef(organizationId);
  const activeProjectIdRef = useRef(activeProjectId);
  // Latest user message the server rejected because another response for
  // this chat was still streaming.
  const activeStreamConflictRef = useRef<string | null>(null);
  const requeueConflictedMessageRef = useRef<(messageId: string) => boolean>(
    () => false
  );
  const selectedModelRef = useRef(selectedModel);
  const thinkingLevelRef = useRef(thinkingLevel);

  const handleChatCreated = useCallback(
    (chatId: string) => {
      void reconcileCreatedChatTitle(
        queryClient,
        organizationId,
        activeProjectId,
        chatId
      );
    },
    [activeProjectId, organizationId, queryClient]
  );
  const onChatCreatedRef = useRef(
    initialChatId ? undefined : handleChatCreated
  );

  useEffect(() => {
    contextRef.current = context;
    hasCustomizedContextRef.current = hasCustomizedContext;
    selectedModelRef.current = effectiveSelectedModel;
    thinkingLevelRef.current = thinkingLevel;
    organizationIdRef.current = organizationId;
    activeProjectIdRef.current = activeProjectId;
    onChatCreatedRef.current = initialChatId ? undefined : handleChatCreated;
  }, [
    activeProjectId,
    context,
    handleChatCreated,
    hasCustomizedContext,
    initialChatId,
    organizationId,
    effectiveSelectedModel,
    thinkingLevel,
  ]);

  // react-doctor-disable-next-line react-hooks-js/refs -- the transport only reads these refs inside fetch callbacks, never during render
  const [transport] = useState(() =>
    createStandaloneChatTransport({
      getSendableMessages,
      live: {
        activeProjectId: activeProjectIdRef,
        context: contextRef,
        hasCustomizedContext: hasCustomizedContextRef,
        onChatCreated: onChatCreatedRef,
        organizationId: organizationIdRef,
        selectedModel: selectedModelRef,
        streamConflict: activeStreamConflictRef,
        thinkingLevel: thinkingLevelRef,
      },
      setPendingMessageId,
    })
  );

  const [wasStoppedByUser, setWasStoppedByUser] = useState(false);
  const wasStoppedByUserRef = useRef(false);

  const drainQueueRef = useRef<() => void>(() => {
    // Populated after dispatchMessage is defined below.
  });
  const flushSteerAfterStopRef = useRef<() => void>(() => {
    // Populated after dispatchMessage is defined below.
  });
  const steerAfterStopRef = useRef<QueuedMessage | null>(null);
  const queuedMessagesRef = useRef<QueuedMessage[]>([]);
  const isDrainingRef = useRef(false);
  // Moving a new chat to its own URL remounts this page, so it waits until no
  // response is streaming or queued.
  const hasPendingChatNavigationRef = useRef(false);
  const navigateToNewChatRef = useRef<() => void>(() => {
    // Populated after the queue refs are defined below.
  });

  const handleFinish = useCallback(
    ({ message }: { message: ChatUIMessage }) => {
      const pinnedModel = getPinnedModelFromAutoMetadata(message.metadata);
      if (pinnedModel) {
        selectedModelRef.current = pinnedModel;
        setSelectedModel(pinnedModel);
      }

      setPendingMessageId(null);
      emitAutumnRefresh();
      queryClient.invalidateQueries({
        queryKey: ["chat-sessions", organizationId],
      });
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") {
          continue;
        }
        const savedPost = createdPostToolOutputSchema.safeParse(part.output);
        if (savedPost.success) {
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.content.get.queryKey({
              input: { organizationId, contentId: savedPost.data.postId },
            }),
          });
        }
      }
      isDrainingRef.current = false;
      if (steerAfterStopRef.current) {
        flushSteerAfterStopRef.current();
        return;
      }
      drainQueueRef.current();
      navigateToNewChatRef.current();
    },
    [organizationId, queryClient]
  );

  const {
    messages,
    setMessages,
    sendMessage,
    addToolApprovalResponse,
    status,
    stop,
  } = useChat<ChatUIMessage>({
    id: stableChatId,
    resume: Boolean(
      initialChatId && historyStreamId && pendingMessageId === historyStreamId
    ),
    experimental_throttle: 90,
    transport,
    sendAutomaticallyWhen: shouldContinueAfterApprovalResponse,
    onFinish: handleFinish,
    onError: (err) => {
      if (steerAfterStopRef.current) {
        flushSteerAfterStopRef.current();
        return;
      }
      const conflictedMessageId = activeStreamConflictRef.current;
      activeStreamConflictRef.current = null;
      if (
        conflictedMessageId &&
        requeueConflictedMessageRef.current(conflictedMessageId)
      ) {
        return;
      }
      discardFailedNewChatFromSidebar({
        chatId: stableChatId,
        initialChatId,
        organizationId,
        queryClient,
        removePendingChatSession,
      });
      handleStandaloneChatError(err, { setChatError, setPendingMessageId });
    },
  });
  const replaceChatMessages = useEffectEvent((next: []) => {
    setMessages(next);
  });

  const [isStopping, setIsStopping] = useState(false);
  const [isWaitingForActiveStream, setIsWaitingForActiveStream] =
    useState(false);
  const isWaitingForActiveStreamRef = useRef(false);

  const handleModelChange = useCallback((model: string) => {
    const nextModel = parseStoredChatModel(model);
    if (!nextModel) {
      return;
    }

    setSelectedModel(nextModel);
    trackEvent(POSTHOG_EVENTS.CHAT_MODEL_CHANGED, { model: nextModel });
  }, []);

  const handleThinkingLevelChange = useCallback((level: ThinkingLevel) => {
    const nextThinkingLevel = parseStoredThinkingLevel(level);
    if (!nextThinkingLevel) {
      return;
    }

    setThinkingLevel(nextThinkingLevel);
    trackEvent(POSTHOG_EVENTS.CHAT_THINKING_LEVEL_CHANGED, {
      level: nextThinkingLevel,
    });
  }, []);

  useEffect(() => {
    if (initialChatId) {
      return;
    }

    function syncChatPreferencesFromStorage() {
      const storedPreferences = readStoredChatPreferences();
      if (!storedPreferences) {
        return;
      }

      setSelectedModel(storedPreferences.model);
      setThinkingLevel(storedPreferences.thinkingLevel);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== CHAT_PREFERENCES_STORAGE_KEY) {
        return;
      }

      syncChatPreferencesFromStorage();
    }

    syncChatPreferencesFromStorage();
    window.addEventListener("focus", syncChatPreferencesFromStorage);
    window.addEventListener("storage", handleStorage);
    document.addEventListener(
      "visibilitychange",
      syncChatPreferencesFromStorage
    );

    return () => {
      window.removeEventListener("focus", syncChatPreferencesFromStorage);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener(
        "visibilitychange",
        syncChatPreferencesFromStorage
      );
    };
  }, [initialChatId]);

  useEffect(() => {
    if (initialChatId) {
      return;
    }

    writeStoredChatPreferences({
      model: selectedModel,
      thinkingLevel,
    });
  }, [initialChatId, selectedModel, thinkingLevel]);

  const stopActiveResponse = useCallback(async () => {
    try {
      if (organizationId && stableChatId) {
        await fetch(
          `/api/organizations/${organizationId}/chat/${encodeURIComponent(stableChatId)}/stop`,
          { method: "POST" }
        );
      }
    } catch (stopError) {
      console.error("[Chat] Failed to notify server to stop:", stopError);
    }
    stop();
  }, [organizationId, stableChatId, stop]);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    updateWasStoppedByUser(true, wasStoppedByUserRef, setWasStoppedByUser);
    await stopActiveResponse();
  }, [stopActiveResponse]);

  const {
    data: chatHistoryData,
    isLoading: isChatHistoryLoading,
    isPending: isChatHistoryPending,
  } = useQuery<{
    messages: ChatUIMessage[] | null;
    lastResponseStopped: boolean;
    activeStreamId: string | null;
    externalChannelId: ExternalChannelId | null;
    slackThreadUrl: string | null;
  } | null>({
    queryKey: ["chat-history", organizationId, initialChatId],
    queryFn: async () => {
      if (!initialChatId) {
        return null;
      }
      const res = await fetch(
        `/api/organizations/${organizationId}/chat/${encodeURIComponent(initialChatId)}`
      );
      if (!res.ok) {
        throw new Error("Failed to load chat history");
      }
      const data = await res.json();
      const externalChannelId = externalChannelIdSchema.safeParse(
        data?.externalChannelId
      );
      return {
        messages: data?.messages ?? null,
        lastResponseStopped: Boolean(data?.lastResponseStopped),
        activeStreamId:
          typeof data?.activeStreamId === "string" ? data.activeStreamId : null,
        externalChannelId: externalChannelId.success
          ? externalChannelId.data
          : null,
        slackThreadUrl:
          typeof data?.slackThreadUrl === "string" ? data.slackThreadUrl : null,
      };
    },
    enabled: Boolean(initialChatId) && Boolean(organizationId),
    staleTime: 1000 * 60 * 5,
  });

  const isSlackMirrored =
    chatHistoryData?.externalChannelId?.source === "slack";

  const messageAuthorsById = useMemo(() => {
    const authors = new Map<string, ChatMessageAuthor>();
    for (const member of membersData?.members ?? []) {
      authors.set(member.user.id, toChatMessageAuthor(member.user));
    }
    return authors;
  }, [membersData?.members]);
  const showMessageAuthorAvatars = shouldShowChatAuthorAvatars({
    isSlackMirrored,
    memberCount: messageAuthorsById.size,
  });
  const currentAuthorUserId = session?.user.id;
  const authorMetadata = useMemo(
    () =>
      currentAuthorUserId ? { authorUserId: currentAuthorUserId } : undefined,
    [currentAuthorUserId]
  );

  const appendMirroredMessage = useCallback(
    (message: ChatUIMessage | null) => {
      if (!message) {
        return;
      }
      setMessages((prev) =>
        prev.some((item) => item.id === message.id)
          ? prev.map((item) => (item.id === message.id ? message : item))
          : [...prev, message]
      );
    },
    [setMessages]
  );

  const [isMirrorWorking, setIsMirrorWorking] = useState(false);

  const handleMirrorStatus = useCallback((status: MirrorChatStatus) => {
    setIsMirrorWorking(status === "working");
  }, []);

  useSlackMirrorStream(
    organizationId,
    initialChatId ?? null,
    isSlackMirrored,
    appendMirroredMessage,
    handleMirrorStatus
  );

  useEffect(() => {
    if (!isMirrorWorking) {
      return;
    }
    const timeout = setTimeout(() => {
      setIsMirrorWorking(false);
    }, MIRROR_WORKING_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [isMirrorWorking]);

  const relayApprovalMutation = useMutation({
    mutationFn: (input: { requestId: string; approved: boolean }) => {
      if (!initialChatId) {
        return Promise.resolve();
      }
      return relaySlackApproval(
        organizationId,
        initialChatId,
        input.requestId,
        input.approved
      );
    },
  });
  const relayMessageMutation = useMutation({
    mutationFn: (input: { text: string; tempId: string }) => {
      if (!initialChatId) {
        return Promise.resolve(null);
      }
      return relaySlackMirrorMessage(organizationId, initialChatId, input.text);
    },
    onSuccess: (message, input) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item.id !== input.tempId);
        if (!message || withoutTemp.some((item) => item.id === message.id)) {
          return withoutTemp;
        }
        return [...withoutTemp, message];
      });
    },
    onError: (_error, input) => {
      setMessages((prev) => prev.filter((item) => item.id !== input.tempId));
      setIsMirrorWorking(false);
      setChatError("Sending to Slack failed. Try again.");
    },
  });
  const relayMessage = useCallback(
    async (text: string) => {
      const tempId = `relay-pending-${nanoid(10)}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", parts: [{ type: "text", text }] },
      ]);
      setIsMirrorWorking(true);
      try {
        await relayMessageMutation.mutateAsync({ text, tempId });
        return true;
      } catch {
        return false;
      }
    },
    [relayMessageMutation, setMessages]
  );

  const relayApproval = useCallback(
    (requestId: string, approved: boolean) => {
      relayApprovalMutation.mutate({ requestId, approved });
    },
    [relayApprovalMutation]
  );

  useLayoutEffect(() => {
    if (!chatHistoryData) {
      return;
    }
    const historyMessages = chatHistoryData.messages;
    if (historyMessages?.length) {
      setMessages(historyMessages);

      let modelRestored = false;
      let thinkingLevelRestored = false;

      for (let index = historyMessages.length - 1; index >= 0; index -= 1) {
        if (modelRestored && thinkingLevelRestored) {
          break;
        }

        const metadata = historyMessages[index]?.metadata;
        if (!metadata) {
          continue;
        }

        if (!modelRestored) {
          const modelToRestore =
            metadata.requestedModel === "auto"
              ? metadata.model
              : (metadata.requestedModel ?? metadata.model);
          if (modelToRestore) {
            const parsedModel = parseStoredChatModel(modelToRestore);
            if (parsedModel) {
              setSelectedModel(parsedModel);
              modelRestored = true;
            }
          }
        }

        if (!thinkingLevelRestored) {
          const thinkingLevelToRestore =
            metadata.requestedThinkingLevel ??
            (metadata.requestedModel && metadata.requestedModel !== "auto"
              ? metadata.thinkingLevel
              : undefined);

          if (thinkingLevelToRestore) {
            const parsedThinkingLevel = parseStoredThinkingLevel(
              thinkingLevelToRestore
            );
            if (parsedThinkingLevel) {
              setThinkingLevel(parsedThinkingLevel);
              thinkingLevelRestored = true;
            }
          }
        }
      }
    }
    updateWasStoppedByUser(
      Boolean(chatHistoryData.lastResponseStopped),
      wasStoppedByUserRef,
      setWasStoppedByUser
    );
    if (chatHistoryData.activeStreamId) {
      setHistoryStreamId(chatHistoryData.activeStreamId);
      setPendingMessageId(chatHistoryData.activeStreamId);
    } else {
      setHistoryStreamId(null);
      setPendingMessageId(null);
    }
  }, [chatHistoryData, setMessages]);

  const hasUpdatedUrlRef = useRef(false);
  const pathname = usePathname();
  const previousInitialChatIdRef = useRef(initialChatId);

  useEffect(() => {
    const returnedToNewChat =
      !initialChatId &&
      hasUpdatedUrlRef.current &&
      pathname === `/${organizationSlug}/chat`;
    if (
      previousInitialChatIdRef.current === initialChatId &&
      !returnedToNewChat
    ) {
      return;
    }
    previousInitialChatIdRef.current = initialChatId;

    if (initialChatId) {
      queuedMessagesRef.current = [];
      clearPendingChatClientState({
        setChatError,
        setPendingMessageId,
        setQueuedMessages,
      });
      return;
    }

    queuedMessagesRef.current = [];
    hasPendingChatNavigationRef.current = false;
    resetNewChatClientState({
      hasUpdatedUrlRef,
      setChatError,
      setContext,
      setGeneratedChatId,
      setHasCustomizedContext,
      setMessages: replaceChatMessages,
      setPendingMessageId,
      setQueuedMessages,
      setWasStoppedByUser,
      wasStoppedByUserRef,
    });
  }, [initialChatId, organizationSlug, pathname]);

  const draftStorageKey = localStorageKeys.chatDraft(
    initialChatId ?? `new:${organizationSlug}`
  );
  const queueStorageKey = currentAuthorUserId
    ? localStorageKeys.chatQueue(stableChatId, currentAuthorUserId)
    : null;
  const loadedQueueKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSlackMirrored || !queueStorageKey) {
      return;
    }
    if (loadedQueueKeyRef.current === queueStorageKey) {
      return;
    }
    loadedQueueKeyRef.current = queueStorageKey;
    try {
      const raw = window.localStorage.getItem(queueStorageKey);
      if (!raw) {
        queuedMessagesRef.current = [];
        setQueuedMessages([]);
        return;
      }
      const parsed = parseQueuedMessages(JSON.parse(raw));
      queuedMessagesRef.current = parsed;
      setQueuedMessages(parsed);
    } catch {
      queuedMessagesRef.current = [];
      setQueuedMessages([]);
    }
  }, [isSlackMirrored, queueStorageKey]);

  useEffect(() => {
    if (!queueStorageKey || loadedQueueKeyRef.current !== queueStorageKey) {
      return;
    }
    try {
      if (queuedMessages.length === 0) {
        window.localStorage.removeItem(queueStorageKey);
      } else {
        window.localStorage.setItem(
          queueStorageKey,
          JSON.stringify(queuedMessages)
        );
      }
    } catch {
      // noop
    }
  }, [queueStorageKey, queuedMessages]);

  const pendingHistoryMessages = chatHistoryData?.messages?.length ?? 0;
  const isLoadingHistory =
    Boolean(initialChatId) &&
    messages.length === 0 &&
    (isChatHistoryLoading ||
      isChatHistoryPending ||
      pendingHistoryMessages > 0);
  const isLoading = status === "streaming" || status === "submitted";
  const activitySeconds = useChatActivityTimer(
    isLoading || isMirrorWorking,
    stableChatId,
    messages.at(-1)?.role === "assistant" ? messages.at(-1)?.id : undefined
  );
  const isPendingAutoSubmit =
    !initialChatId && Boolean(initialQuery?.trim()) && messages.length === 0;
  const isProjectScopePending = !initialChatId && !isProjectResolved;
  const hasMessages = messages.length > 0;

  const [isFirstMessageTransition, setIsFirstMessageTransition] =
    useState(false);
  const firstMessageTransitionTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const triggerFirstMessageTransition = useCallback(() => {
    if (firstMessageTransitionTimerRef.current) {
      clearTimeout(firstMessageTransitionTimerRef.current);
    }
    setIsFirstMessageTransition(true);
    firstMessageTransitionTimerRef.current = setTimeout(() => {
      setIsFirstMessageTransition(false);
      firstMessageTransitionTimerRef.current = null;
    }, 600);
  }, []);
  useEffect(
    () => () => {
      if (firstMessageTransitionTimerRef.current) {
        clearTimeout(firstMessageTransitionTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return target.isContentEditable;
    }

    function handleAutoFocus(event: KeyboardEvent) {
      if (isSlackMirrored) {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key.length !== 1) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      chatInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleAutoFocus);
    return () => {
      window.removeEventListener("keydown", handleAutoFocus);
    };
  }, [isSlackMirrored]);

  const handleAddContext = useCallback((item: ContextItem) => {
    setHasCustomizedContext(true);
    trackEvent(POSTHOG_EVENTS.CHAT_CONTEXT_ADDED, {
      kind: getChatContextKind(item.type),
    });
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
    setHasCustomizedContext(true);
    trackEvent(POSTHOG_EVENTS.CHAT_CONTEXT_REMOVED, {
      kind: getChatContextKind(item.type),
    });
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

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const extractUserMessageContent = useCallback((message: ChatUIMessage) => {
    let text = "";
    const attachments: ChatMessagePart[] = [];
    for (const part of message.parts) {
      if (part.type === "text") {
        text += part.text;
      } else if (part.type === "file") {
        attachments.push({
          type: "file",
          url: part.url,
          mediaType: part.mediaType,
          filename: part.filename,
        });
      }
    }
    return { text, attachments };
  }, []);

  const getUserMessageText = useCallback(
    (message: ChatUIMessage) => extractUserMessageContent(message).text,
    [extractUserMessageContent]
  );

  const toDisplayText = useCallback((serialized: string) => {
    return serialized.replace(
      INTEGRATION_REFERENCE_TOKEN_SPLIT_REGEX,
      (match) => {
        const item = parseReferenceValue(match);
        return item ? getReferenceDisplay(item) : match;
      }
    );
  }, []);

  const handleStartEditMessage = useCallback((messageId: string) => {
    setEditingMessageId(messageId);
  }, []);

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const resendFromUserMessage = useCallback(
    async (
      userMessageId: string,
      text: string,
      attachments: ChatMessagePart[],
      modelOverride?: string
    ) => {
      if (isSlackMirrored) {
        return;
      }

      const current = messagesRef.current;
      const index = current.findIndex((m) => m.id === userMessageId);
      if (index === -1) {
        return;
      }

      const currentTail = current.slice(index);
      const truncated = current.slice(0, index + 1);

      setMessageBranches((prev) => {
        const existing = prev[userMessageId];
        if (!existing) {
          return {
            ...prev,
            [userMessageId]: { tails: [currentTail, []], active: 1 },
          };
        }
        const tails = [...existing.tails];
        tails[existing.active] = currentTail;
        tails.push([]);
        return {
          ...prev,
          [userMessageId]: { tails, active: tails.length - 1 },
        };
      });

      if (modelOverride) {
        const parsed = parseStoredChatModel(modelOverride);
        if (parsed) {
          selectedModelRef.current = parsed;
          setSelectedModel(parsed);
        }
      }

      setMessages(truncated);
      setIsStopping(false);
      updateWasStoppedByUser(false, wasStoppedByUserRef, setWasStoppedByUser);
      setChatError(null);
      if (attachments.length > 0) {
        const parts: ChatMessagePart[] = [];
        if (text.length > 0) {
          parts.push({ type: "text", text });
        }
        parts.push(...attachments);
        await sendMessage({
          role: "user",
          parts,
          messageId: userMessageId,
          metadata: authorMetadata,
        });
      } else {
        await sendMessage({
          text,
          messageId: userMessageId,
          metadata: authorMetadata,
        });
      }
    },
    [authorMetadata, isSlackMirrored, sendMessage, setMessages]
  );

  const handleEditMessage = useCallback(
    async (userMessageId: string, newText: string) => {
      setEditingMessageId(null);
      trackEvent(POSTHOG_EVENTS.CHAT_MESSAGE_EDITED, { chat_id: stableChatId });
      const current = messagesRef.current;
      const message = current.find((m) => m.id === userMessageId);
      const attachments = message
        ? extractUserMessageContent(message).attachments
        : [];
      await resendFromUserMessage(userMessageId, newText, attachments);
    },
    [extractUserMessageContent, resendFromUserMessage, stableChatId]
  );

  const handleRetryMessage = useCallback(
    async (userMessageId: string, modelOverride?: string) => {
      const current = messagesRef.current;
      const message = current.find((m) => m.id === userMessageId);
      if (!message) {
        return;
      }
      const { text, attachments } = extractUserMessageContent(message);
      if (!text.trim() && attachments.length === 0) {
        return;
      }
      trackEvent(POSTHOG_EVENTS.CHAT_RETRY, {
        chat_id: stableChatId,
        model: modelOverride ?? null,
      });
      await resendFromUserMessage(
        userMessageId,
        text,
        attachments,
        modelOverride
      );
    },
    [extractUserMessageContent, resendFromUserMessage, stableChatId]
  );

  const [branchSwitchSignal, setBranchSwitchSignal] = useState<{
    userMessageId: string;
    tick: number;
  } | null>(null);

  const handleSwitchBranch = useCallback(
    (userMessageId: string, direction: "prev" | "next") => {
      const existing = messageBranches[userMessageId];
      if (!existing || existing.tails.length <= 1) {
        return;
      }
      const current = messagesRef.current;
      const index = current.findIndex((m) => m.id === userMessageId);
      if (index === -1) {
        return;
      }
      const before = current.slice(0, index);
      const currentTail = current.slice(index);

      const tails = [...existing.tails];
      tails[existing.active] = currentTail;
      const total = tails.length;
      const active =
        direction === "next"
          ? (existing.active + 1) % total
          : (existing.active - 1 + total) % total;

      setMessageBranches((prev) => ({
        ...prev,
        [userMessageId]: { tails, active },
      }));
      setMessages([...before, ...(tails[active] ?? [])]);

      setBranchSwitchSignal({ userMessageId, tick: Date.now() });
      trackEvent(POSTHOG_EVENTS.CHAT_BRANCH_SWITCHED, {
        chat_id: stableChatId,
        direction,
        branch_count: total,
      });
    },
    [messageBranches, setMessages, stableChatId]
  );

  const dispatchMessage = useCallback(
    async (text: string, attachments: ChatAttachment[] = []) => {
      if (isSlackMirrored || isProjectScopePending) {
        return;
      }

      if (text.trim().length === 0 && attachments.length === 0) {
        return;
      }

      const isFirstMessage = !initialChatId && !hasUpdatedUrlRef.current;
      if (messagesRef.current.length === 0) {
        triggerFirstMessageTransition();
      }
      setIsStopping(false);
      updateWasStoppedByUser(false, wasStoppedByUserRef, setWasStoppedByUser);
      for (const message of messagesRef.current) {
        if (message.role !== "assistant") {
          continue;
        }
        for (const part of message.parts) {
          if (!(isToolUIPart(part) && part.state === "approval-requested")) {
            continue;
          }
          const approvalId = part.approval?.id;
          if (!approvalId) {
            continue;
          }
          addToolApprovalResponse({
            id: approvalId,
            approved: false,
          });
        }
      }
      if (isFirstMessage) {
        hasUpdatedUrlRef.current = true;
        hasPendingChatNavigationRef.current = true;
        window.history.replaceState(
          null,
          "",
          `/${organizationSlug}/chat/${stableChatId}`
        );
        insertPendingChatSession(stableChatId);
      }
      if (attachments.length > 0) {
        const parts: ChatMessagePart[] = [];
        if (text.length > 0) {
          parts.push({ type: "text", text });
        }
        for (const attachment of attachments) {
          parts.push({
            type: "file",
            url: attachment.url,
            mediaType: attachment.mediaType,
            filename: attachment.filename,
          });
        }
        await sendMessage({ role: "user", parts, metadata: authorMetadata });
      } else {
        await sendMessage({ text, metadata: authorMetadata });
      }
    },
    [
      addToolApprovalResponse,
      authorMetadata,
      initialChatId,
      insertPendingChatSession,
      isProjectScopePending,
      isSlackMirrored,
      organizationSlug,
      sendMessage,
      stableChatId,
      triggerFirstMessageTransition,
    ]
  );

  const handleSend = useCallback(
    async (text: string, attachments: ChatAttachment[] = []) => {
      if (isSlackMirrored) {
        const trimmed = text.trim();
        if (trimmed.length > 0) {
          relayMessage(trimmed);
        }
        return;
      }
      if (isLoading || isWaitingForActiveStream) {
        if (attachments.length > 0) {
          return;
        }
        const next = [
          ...queuedMessagesRef.current,
          {
            id: nanoid(10),
            text,
            authorUserId: currentAuthorUserId,
          },
        ];
        queuedMessagesRef.current = next;
        setQueuedMessages(next);
        return;
      }
      await dispatchMessage(text, attachments);
    },
    [
      currentAuthorUserId,
      dispatchMessage,
      isLoading,
      isSlackMirrored,
      isWaitingForActiveStream,
      relayMessage,
    ]
  );

  const autoSubmittedQueryRef = useRef<string | null>(null);
  const pendingInitialQueryResetRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialChatId) {
      return;
    }
    const trimmedInitialQuery = initialQuery?.trim();
    if (!trimmedInitialQuery) {
      autoSubmittedQueryRef.current = null;
      pendingInitialQueryResetRef.current = null;
      return;
    }
    if (autoSubmittedQueryRef.current === trimmedInitialQuery) {
      return;
    }
    if (!organizationId || !isProjectResolved) {
      return;
    }
    if (messagesRef.current.length > 0) {
      if (pendingInitialQueryResetRef.current === trimmedInitialQuery) {
        return;
      }
      pendingInitialQueryResetRef.current = trimmedInitialQuery;
      queuedMessagesRef.current = [];
      resetNewChatClientState({
        hasUpdatedUrlRef,
        setChatError,
        setContext,
        setGeneratedChatId,
        setHasCustomizedContext,
        setMessages: replaceChatMessages,
        setPendingMessageId,
        setQueuedMessages,
        setWasStoppedByUser,
        wasStoppedByUserRef,
      });
      return;
    }

    const queryToSubmit = trimmedInitialQuery;
    let cancelled = false;
    let attempts = 0;

    function submitWhenComposerIsReady() {
      if (cancelled) {
        return;
      }

      const chatInput = chatInputRef.current;
      if (!chatInput) {
        attempts += 1;
        if (attempts < 10) {
          window.requestAnimationFrame(submitWhenComposerIsReady);
        }
        return;
      }

      autoSubmittedQueryRef.current = queryToSubmit;
      pendingInitialQueryResetRef.current = null;
      chatInput.setText(queryToSubmit);
      window.requestAnimationFrame(() => {
        chatInput.submit();
        setInitialQuery(null);
      });
    }

    submitWhenComposerIsReady();

    return () => {
      cancelled = true;
    };
  }, [
    initialChatId,
    initialQuery,
    isProjectResolved,
    organizationId,
    setInitialQuery,
  ]);

  const handleRemoveQueued = useCallback((id: string) => {
    if (steerAfterStopRef.current?.id === id) {
      steerAfterStopRef.current = null;
      updateWasStoppedByUser(true, wasStoppedByUserRef, setWasStoppedByUser);
    }
    const next = queuedMessagesRef.current.filter((m) => m.id !== id);
    queuedMessagesRef.current = next;
    setQueuedMessages(next);
  }, []);

  const handleEditQueued = useCallback((message: QueuedMessage) => {
    if (steerAfterStopRef.current?.id === message.id) {
      steerAfterStopRef.current = null;
      updateWasStoppedByUser(true, wasStoppedByUserRef, setWasStoppedByUser);
    }
    const next = queuedMessagesRef.current.filter((m) => m.id !== message.id);
    queuedMessagesRef.current = next;
    setQueuedMessages(next);
    chatInputRef.current?.setText(message.text);
  }, []);

  const sendSteeredQueued = useCallback(
    (message: QueuedMessage) => {
      const taken = takeQueuedMessage(queuedMessagesRef.current, message.id);
      if (!taken) {
        return;
      }
      queuedMessagesRef.current = taken.remaining;
      setQueuedMessages(taken.remaining);
      updateWasStoppedByUser(false, wasStoppedByUserRef, setWasStoppedByUser);
      dispatchMessage(message.text).catch((error) => {
        console.error("[Chat] Failed to steer queued message:", error);
        const restored = [message, ...queuedMessagesRef.current];
        queuedMessagesRef.current = restored;
        setQueuedMessages(restored);
      });
    },
    [dispatchMessage]
  );

  const flushSteerAfterStop = useCallback(() => {
    const next = steerAfterStopRef.current;
    if (!next) {
      return;
    }
    steerAfterStopRef.current = null;
    sendSteeredQueued(next);
  }, [sendSteeredQueued]);

  const handleSteerQueued = useCallback(
    (message: QueuedMessage) => {
      if (steerAfterStopRef.current) {
        return;
      }
      if (
        !queuedMessagesRef.current.some((queued) => queued.id === message.id)
      ) {
        return;
      }
      if (!(isLoading || isWaitingForActiveStream)) {
        sendSteeredQueued(message);
        return;
      }
      const next = markQueuedMessageSteering(
        queuedMessagesRef.current,
        message.id
      );
      queuedMessagesRef.current = next;
      setQueuedMessages(next);
      steerAfterStopRef.current = message;
      updateWasStoppedByUser(false, wasStoppedByUserRef, setWasStoppedByUser);
      stopActiveResponse().catch((error) => {
        console.error(
          "[Chat] Failed to stop active response for steer:",
          error
        );
        flushSteerAfterStop();
      });
    },
    [
      flushSteerAfterStop,
      isLoading,
      isWaitingForActiveStream,
      sendSteeredQueued,
      stopActiveResponse,
    ]
  );

  const handleUpdateQueued = useCallback((id: string, text: string) => {
    const next = queuedMessagesRef.current.map((m) =>
      m.id === id ? { ...m, text } : m
    );
    queuedMessagesRef.current = next;
    setQueuedMessages(next);
  }, []);

  useEffect(() => {
    flushSteerAfterStopRef.current = flushSteerAfterStop;
  }, [flushSteerAfterStop]);

  const navigateToNewChat = useCallback(() => {
    if (
      !hasPendingChatNavigationRef.current ||
      isDrainingRef.current ||
      isWaitingForActiveStreamRef.current ||
      queuedMessagesRef.current.length > 0
    ) {
      return;
    }
    hasPendingChatNavigationRef.current = false;
    queryClient.setQueryData(["chat-history", organizationId, stableChatId], {
      messages: messagesRef.current,
      lastResponseStopped: wasStoppedByUserRef.current,
      activeStreamId: null,
      externalChannelId: null,
      slackThreadUrl: null,
    });
    router.replace(`/${organizationSlug}/chat/${stableChatId}`, {
      scroll: false,
    });
    queryClient.invalidateQueries({
      queryKey: ["chat-sessions", organizationId],
    });
  }, [organizationId, organizationSlug, queryClient, router, stableChatId]);

  useEffect(() => {
    navigateToNewChatRef.current = navigateToNewChat;
  }, [navigateToNewChat]);

  const seenToolOutputsRef = useRef<Set<string>>(new Set());
  const prevIsLoadingRef = useRef(false);

  useEffect(() => {
    drainQueueRef.current = () => {
      if (isSlackMirrored) {
        return;
      }
      if (isDrainingRef.current || isWaitingForActiveStreamRef.current) {
        return;
      }
      if (wasStoppedByUserRef.current) {
        return;
      }
      if (steerAfterStopRef.current) {
        return;
      }
      if (hasPendingApproval(messagesRef.current)) {
        return;
      }
      const queue = queuedMessagesRef.current;
      const next = queue[0];
      if (!next) {
        return;
      }

      isDrainingRef.current = true;
      const remaining = queue.slice(1);
      queuedMessagesRef.current = remaining;
      setQueuedMessages(remaining);
      dispatchMessage(next.text).catch((error) => {
        console.error("[Chat] Failed to drain queued message:", error);
        isDrainingRef.current = false;
        const restored = [next, ...queuedMessagesRef.current];
        queuedMessagesRef.current = restored;
        setQueuedMessages(restored);
      });
    };
  }, [dispatchMessage, isSlackMirrored]);

  const activeStreamPollRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const stopActiveStreamPolling = useCallback(() => {
    if (activeStreamPollRef.current) {
      clearInterval(activeStreamPollRef.current);
      activeStreamPollRef.current = null;
    }
  }, []);

  const checkActiveStream = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/chat/${encodeURIComponent(stableChatId)}`
    );
    if (!(response.ok && activeStreamPollRef.current)) {
      return;
    }
    const data: {
      messages?: ChatUIMessage[] | null;
      activeStreamId?: string | null;
    } = await response.json();
    if (data.activeStreamId || !activeStreamPollRef.current) {
      return;
    }
    stopActiveStreamPolling();
    // Continue from the server history so the finished response is kept
    // instead of being overwritten by this client's stale copy.
    if (data.messages?.length) {
      setMessages(data.messages);
    }
    isWaitingForActiveStreamRef.current = false;
    setIsWaitingForActiveStream(false);
  }, [organizationId, setMessages, stableChatId, stopActiveStreamPolling]);

  const startActiveStreamPolling = useCallback(() => {
    stopActiveStreamPolling();
    let isChecking = false;
    activeStreamPollRef.current = setInterval(() => {
      if (isChecking) {
        return;
      }
      isChecking = true;
      checkActiveStream()
        .catch((error) => {
          console.error("[Chat] Failed to check the active response:", error);
        })
        .finally(() => {
          isChecking = false;
        });
    }, CHAT_ACTIVE_STREAM_POLL_INTERVAL_MS);
  }, [checkActiveStream, stopActiveStreamPolling]);

  useEffect(() => stopActiveStreamPolling, [stopActiveStreamPolling]);

  useEffect(() => {
    requeueConflictedMessageRef.current = (messageId) => {
      const current = messagesRef.current;
      const index = current.findIndex((message) => message.id === messageId);
      const message = current[index];
      if (!message || message.role !== "user") {
        return false;
      }
      const { text, attachments } = extractUserMessageContent(message);
      // The queue carries text only; attachments keep the error and retry flow.
      if (attachments.length > 0 || !text.trim()) {
        return false;
      }
      setMessages(current.slice(0, index));
      const requeued: QueuedMessage = {
        id: nanoid(10),
        text,
        authorUserId: currentAuthorUserId,
      };
      queuedMessagesRef.current = [requeued, ...queuedMessagesRef.current];
      setQueuedMessages(queuedMessagesRef.current);
      isDrainingRef.current = false;
      isWaitingForActiveStreamRef.current = true;
      setIsWaitingForActiveStream(true);
      setPendingMessageId(null);
      startActiveStreamPolling();
      return true;
    };
  }, [
    currentAuthorUserId,
    extractUserMessageContent,
    setMessages,
    startActiveStreamPolling,
  ]);

  const wasWaitingForActiveStreamRef = useRef(false);
  useEffect(() => {
    if (isWaitingForActiveStream) {
      wasWaitingForActiveStreamRef.current = true;
      return;
    }
    if (!wasWaitingForActiveStreamRef.current || isLoading) {
      return;
    }
    wasWaitingForActiveStreamRef.current = false;
    if (steerAfterStopRef.current) {
      flushSteerAfterStopRef.current();
      return;
    }
    drainQueueRef.current();
  }, [isLoading, isWaitingForActiveStream]);

  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
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
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (isSlackMirrored) {
      return;
    }
    if (!isLoading) {
      return;
    }
    if (isDrainingRef.current) {
      return;
    }
    if (wasStoppedByUser) {
      return;
    }
    if (queuedMessages.length === 0) {
      return;
    }
    if (hasPendingApproval(messages)) {
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

    stopActiveResponse().catch((error) => {
      console.error(
        "[Chat] Failed to stop active response for queue drain:",
        error
      );
      isDrainingRef.current = false;
    });
  }, [
    isLoading,
    messages,
    queuedMessages.length,
    isSlackMirrored,
    wasStoppedByUser,
    stopActiveResponse,
  ]);

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      if (isSlackMirrored) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key.length !== 1) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      chatInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, [isSlackMirrored]);

  const handleClearError = useCallback(() => setChatError(null), []);

  const handleRetryAfterError = useCallback(async () => {
    let lastUserMessage: ChatUIMessage | undefined;
    for (const message of messagesRef.current) {
      if (message.role === "user") {
        lastUserMessage = message;
      }
    }
    if (!lastUserMessage) {
      return;
    }
    setChatError(null);
    await handleRetryMessage(lastUserMessage.id);
  }, [handleRetryMessage]);

  const chatActivity = getChatActivity(messages, isLoading || isMirrorWorking, {
    isStandaloneTool: (part) =>
      isContentEditorStandaloneTool(part) ||
      (isToolUIPart(part) &&
        part.type !== "dynamic-tool" &&
        (isCreateTool(part.type) || part.type === "tool-createImage")),
  });

  function renderPart(
    part: ChatUIMessage["parts"][number],
    messageId: string,
    index: number
  ) {
    if (part.type === "text") {
      const text = part.text as string;
      if (!text.trim()) {
        return null;
      }

      const hasInlineReference =
        text.includes("integration/github/") ||
        text.includes("integration/linear/") ||
        text.includes("integration/mcp/");

      if (hasInlineReference) {
        return (
          <div
            className="size-full wrap-break-word whitespace-pre-wrap"
            key={`${messageId}-text-${index}`}
          >
            {renderTextWithIntegrationReferences(text, mcpLogosByConnectionId)}
          </div>
        );
      }

      return (
        <MessageResponse
          isAnimating={messageId === chatActivity.activeMessageId}
        >
          {text}
        </MessageResponse>
      );
    }

    if (part.type === "file") {
      const url = typeof part.url === "string" ? part.url : "";
      const mediaType =
        typeof part.mediaType === "string" ? part.mediaType : "";
      const filename =
        typeof part.filename === "string" ? part.filename : undefined;
      if (!url) {
        return null;
      }
      const fileKey = `${messageId}-file-${index}`;
      if (isImageMimeType(mediaType)) {
        return (
          <ChatImageAttachment
            filename={filename}
            key={fileKey}
            mediaType={mediaType}
            onClick={() =>
              setPreviewAttachment({
                url,
                filename: filename ?? "attachment",
                mediaType,
              })
            }
            url={url}
          />
        );
      }
      return (
        <a
          className="border-border bg-muted/40 text-foreground hover:bg-accent my-1 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs no-underline transition-colors"
          href={url}
          key={fileKey}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="truncate">
            {filename ?? mediaType ?? "Attachment"}
          </span>
        </a>
      );
    }

    if (part.type === "reasoning") {
      const text = part.text as string;
      if (!text) {
        return null;
      }
      const reasoningKey = `${messageId}-reasoning-${index}`;
      return <ChatReasoningBlock key={reasoningKey}>{text}</ChatReasoningBlock>;
    }

    if (isToolUIPart(part)) {
      const toolPart = part as RenderableToolPart;
      const toolName = getToolName(toolPart);
      const staticToolType =
        toolPart.type === "dynamic-tool" ? null : toolPart.type;

      if (staticToolType && isCreateTool(staticToolType)) {
        const contentType = getCreateToolContentType(
          staticToolType as keyof typeof CREATE_TOOL_TYPES
        );
        const input = toolPart.input as
          | { title?: string; markdown?: string }
          | undefined;
        const title = input?.title ?? "Untitled";
        const markdown = input?.markdown ?? "";

        if (
          toolPart.state === "input-streaming" ||
          toolPart.state === "input-available"
        ) {
          if (messageId !== chatActivity.activeMessageId) {
            return (
              <CompletedToolTimer
                key={toolPart.toolCallId}
                toolCallId={toolPart.toolCallId}
              >
                <span className="text-muted-foreground text-sm">
                  Draft generation interrupted
                </span>
              </CompletedToolTimer>
            );
          }
          if (chatActivity.hasInlineActivity) {
            return null;
          }
          return (
            <CreateToolPendingIndicator
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            />
          );
        }

        if (toolPart.state === "output-error") {
          return (
            <CompletedToolTimer
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            >
              <div className="bg-destructive/10 text-destructive flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs">
                <HugeiconsIcon className="size-3.5" icon={X} />
                <span>Draft generation failed. The assistant will retry.</span>
              </div>
            </CompletedToolTimer>
          );
        }

        if (toolPart.state === "output-denied") {
          return (
            <CompletedToolTimer
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            />
          );
        }

        if (toolPart.approval?.reason === "discard") {
          return (
            <CompletedToolTimer
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            />
          );
        }

        const savedPostResult = createdPostToolOutputSchema.safeParse(
          toolPart.output
        );
        const savedPost = savedPostResult.success
          ? savedPostResult.data
          : undefined;
        const previewState: "draft" | "finished" =
          toolPart.state === "output-available" ||
          toolPart.approval?.reason === "manual-draft" ||
          toolPart.approval?.reason === "manual-published"
            ? "finished"
            : "draft";
        const persistedStatus: "draft" | "published" =
          savedPost?.status === "published" ||
          toolPart.approval?.reason === "manual-published"
            ? "published"
            : "draft";

        const approvalId =
          toolPart.state === "approval-requested"
            ? toolPart.approval.id
            : undefined;
        const trackDraftAction = (action: ChatDraftAction) => {
          trackEvent(POSTHOG_EVENTS.CHAT_DRAFT_ACTION, {
            action,
            type: contentType,
            chat_id: stableChatId,
            relayed_to_slack: isSlackMirrored,
          });
        };
        const handleApprove = approvalId
          ? () => {
              trackDraftAction("approve");
              return isSlackMirrored
                ? relayApprovalMutation.mutateAsync({
                    requestId: approvalId,
                    approved: true,
                  })
                : addToolApprovalResponse({
                    id: approvalId,
                    approved: true,
                  });
            }
          : undefined;
        const handleDeny = approvalId
          ? () => {
              trackDraftAction("deny");
              return isSlackMirrored
                ? relayApproval(approvalId, false)
                : addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "discard",
                  });
            }
          : undefined;
        const handlePersist =
          approvalId && !isSlackMirrored
            ? async (
                status: "draft" | "published",
                payload: { title: string; markdown: string }
              ) => {
                trackDraftAction(
                  status === "published" ? "save_published" : "save_draft"
                );
                const response = await fetch(
                  `/api/organizations/${organizationId}/chat/posts`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...payload,
                      chatId: stableChatId,
                      toolCallId: toolPart.toolCallId,
                      contentType,
                      status,
                    }),
                  }
                );
                if (!response.ok) {
                  throw new Error("Failed to save post");
                }
                const savedPost = createdPostToolOutputSchema.parse(
                  await response.json()
                );
                setMessages((current) =>
                  linkSavedChatPosts(current, [
                    {
                      postId: savedPost.postId,
                      toolCallId: toolPart.toolCallId,
                      title: payload.title,
                      markdown: payload.markdown,
                      contentType,
                      status,
                    },
                  ])
                );
                queryClient.invalidateQueries({
                  queryKey: ["chat-sessions", organizationId],
                });
              }
            : undefined;
        const handleRegenerate = approvalId
          ? async (
              instructions: string,
              payload: { title: string; markdown: string }
            ) => {
              trackDraftAction("regenerate");
              const regeneratePrompt = `Regenerate the ${getOutputTypeLabel(contentType)} with these changes: ${instructions}\n\nCurrent title: ${payload.title}\n\nCurrent draft:\n${payload.markdown}`;
              if (isSlackMirrored) {
                const sent = await relayMessage(regeneratePrompt);
                if (sent) {
                  await relayApprovalMutation.mutateAsync({
                    requestId: approvalId,
                    approved: false,
                  });
                }
                return;
              }
              await addToolApprovalResponse({
                id: approvalId,
                approved: false,
                reason: "discard",
              });
              sendMessage({
                text: regeneratePrompt,
                metadata: authorMetadata,
              });
            }
          : undefined;

        const handlePublished = (published: PublishedSocialPost) => {
          trackEvent(POSTHOG_EVENTS.CHAT_DRAFT_ACTION, {
            action: "publish_social",
            type: contentType,
            chat_id: stableChatId,
            platform: published.platform,
            relayed_to_slack: isSlackMirrored,
          });
          sendMessage({
            text: buildPublishedChatMessage(published),
            metadata: authorMetadata,
          });
        };

        if (contentType === "twitter_post") {
          return (
            <CompletedToolTimer
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            >
              <TwitterPreview
                markdown={markdown}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onPersist={handlePersist}
                onPublished={handlePublished}
                onRegenerate={handleRegenerate}
                organization={{
                  name: organization?.name ?? "Your Name",
                  logo: organization?.logo ?? null,
                }}
                organizationId={organizationId}
                persistedStatus={persistedStatus}
                state={previewState}
                title={title}
              />
            </CompletedToolTimer>
          );
        }

        if (contentType === "linkedin_post") {
          return (
            <CompletedToolTimer
              key={toolPart.toolCallId}
              toolCallId={toolPart.toolCallId}
            >
              <LinkedInPreview
                markdown={markdown}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onPersist={handlePersist}
                onPublished={handlePublished}
                onRegenerate={handleRegenerate}
                organization={{
                  name: organization?.name ?? "Your Name",
                  logo: organization?.logo ?? null,
                }}
                organizationId={organizationId}
                persistedStatus={persistedStatus}
                state={previewState}
                title={title}
              />
            </CompletedToolTimer>
          );
        }

        return (
          <CompletedToolTimer
            key={toolPart.toolCallId}
            toolCallId={toolPart.toolCallId}
          >
            <BlogChangelogPreview
              contentType={contentType}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              postId={savedPost?.postId}
              onRevise={() => {
                if (isInputEmpty) {
                  chatInputRef.current?.setText(`Revise "${title}": `);
                } else {
                  chatInputRef.current?.focus();
                }
              }}
              markdown={markdown}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onPersist={handlePersist}
              persistedStatus={persistedStatus}
              state={previewState}
              title={title}
            />
          </CompletedToolTimer>
        );
      }

      if (
        toolPart.state === "input-streaming" ||
        toolPart.state === "input-available" ||
        toolPart.state === "approval-requested" ||
        toolPart.state === "output-available" ||
        toolPart.state === "output-error"
      ) {
        const approvalId =
          toolPart.state === "approval-requested"
            ? toolPart.approval.id
            : undefined;
        const trackToolApproval = (decision: ChatToolApprovalDecision) => {
          trackEvent(POSTHOG_EVENTS.CHAT_TOOL_APPROVAL, {
            tool: toolName,
            decision,
            chat_id: stableChatId,
            relayed_to_slack: isSlackMirrored,
          });
        };
        const handleApprove = approvalId
          ? () => {
              trackToolApproval("approved");
              return isSlackMirrored
                ? relayApproval(approvalId, true)
                : addToolApprovalResponse({
                    id: approvalId,
                    approved: true,
                  });
            }
          : undefined;
        const handleDeny = approvalId
          ? () => {
              trackToolApproval("denied");
              return isSlackMirrored
                ? relayApproval(approvalId, false)
                : addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                  });
            }
          : undefined;
        const output =
          toolPart.state === "output-error"
            ? { error: toolPart.errorText }
            : toolPart.output;
        const toolMetadata =
          toolPart.type === "dynamic-tool" ? toolPart.toolMetadata : undefined;
        const mcpLogos = toolName.startsWith("mcp_")
          ? mcpLogosByConnectionId.get(getMcpToolServerId(toolMetadata) ?? "")
          : undefined;

        return (
          <ChatToolBlock
            input={toolPart.input}
            isActive={messageId === chatActivity.activeMessageId}
            isMcp={toolName.startsWith("mcp_")}
            key={toolPart.toolCallId}
            mcpLogoDarkUrl={mcpLogos?.darkUrl}
            mcpLogoLightUrl={mcpLogos?.lightUrl}
            onApprove={handleApprove}
            onDeny={handleDeny}
            output={output}
            state={toolPart.state}
            toolCallId={toolPart.toolCallId}
            toolMetadata={toolMetadata}
            toolName={toolName}
          />
        );
      }

      return (
        <CompletedToolTimer
          key={toolPart.toolCallId}
          toolCallId={toolPart.toolCallId}
        />
      );
    }

    return null;
  }

  if (isLoadingHistory) {
    return <ChatPageSkeleton />;
  }

  if (!(hasMessages || isPendingAutoSubmit || isLoading)) {
    if (isSlackMirrored) {
      return (
        <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center px-4">
          <div className="mx-auto w-full max-w-2xl min-w-0">
            <SlackMirrorNotice />
          </div>
        </div>
      );
    }

    const now = isHydrated ? new Date() : null;
    const greeting = now ? getGreeting(now) : "Welcome";
    const userName = isHydrated
      ? session?.user?.name?.split(" ")[0]
      : undefined;
    const dateStr = now ? formatLongDate(now) : "\u00A0";

    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-4">
          <div className="w-full space-y-1">
            <p className="text-muted-foreground text-xs">{dateStr}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting}
              {userName ? `, ${userName}` : ""}
            </h1>
          </div>
          <div className="w-full min-w-0">
            {isProjectScopePending ? (
              <ProjectScopeLoadingInput />
            ) : (
              <ChatInputAdvanced
                availableModels={availableModels}
                authorsById={messageAuthorsById}
                context={context}
                draftStorageKey={draftStorageKey}
                error={chatError}
                initialValue={initialQuery ?? undefined}
                isLoading={isLoading}
                isStopping={isStopping}
                model={effectiveSelectedModel}
                onAddContext={handleAddContext}
                onClearError={handleClearError}
                onEditQueued={handleEditQueued}
                onEmptyChange={setIsInputEmpty}
                onModelChange={handleModelChange}
                onRemoveContext={handleRemoveContext}
                onRemoveQueued={handleRemoveQueued}
                onSend={handleSend}
                onSteerQueued={handleSteerQueued}
                onStop={handleStop}
                onThinkingLevelChange={handleThinkingLevelChange}
                onUpdateQueued={handleUpdateQueued}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                queuedMessages={queuedMessages}
                ref={chatInputRef}
                showAuthorAvatars={showMessageAuthorAvatars}
                thinkingLevel={thinkingLevel}
              />
            )}
          </div>
          <ChatSuggestions
            disabled={isLoading || isProjectScopePending}
            hidden={!isInputEmpty}
            onSelect={handleSuggestionSelect}
          />
        </div>
      </div>
    );
  }

  const lastMessage = messages.at(-1);
  const { showThinkingIndicator } = chatActivity;
  const visibleMessages = messages.filter((message) =>
    hasVisibleChatContent(message)
  );

  return (
    <>
      <LazyMotion features={loadMotionFeatures} strict>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MessageScrollerProvider autoScroll>
            <ChatScrollOnSend
              lastUserMessageId={
                visibleMessages.findLast((message) => message.role === "user")
                  ?.id
              }
            />
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport className="min-w-0 overflow-x-hidden">
                <MessageScrollerContent className="gap-8 px-4 pt-6 pb-8">
                  {(() => {
                    const branchPointIndex = branchSwitchSignal
                      ? visibleMessages.findIndex(
                          (m) => m.id === branchSwitchSignal.userMessageId
                        )
                      : -1;
                    const lastVisibleMessage = visibleMessages.at(-1);
                    const lastAssistantMessageId =
                      lastVisibleMessage?.role === "assistant"
                        ? lastVisibleMessage.id
                        : undefined;
                    return visibleMessages.map((message, messageIndex) => {
                      const isUser = message.role === "user";
                      const isEditing =
                        isUser && editingMessageId === message.id;
                      const userContentParts = isUser
                        ? message.parts.filter((part) => part.type !== "file")
                        : message.parts;
                      const userImageParts = isUser
                        ? message.parts.filter(
                            (part) =>
                              part.type === "file" &&
                              typeof part.mediaType === "string" &&
                              isImageMimeType(part.mediaType)
                          )
                        : [];
                      const userFileParts = isUser
                        ? message.parts.filter(
                            (part) =>
                              part.type === "file" &&
                              (typeof part.mediaType !== "string" ||
                                !isImageMimeType(part.mediaType))
                          )
                        : [];
                      const branches = isUser
                        ? messageBranches[message.id]
                        : undefined;
                      const branchTotal = branches?.tails.length ?? 0;
                      const branchIdx = branches?.active ?? 0;
                      const isDownstreamOfBranchSwitch =
                        branchPointIndex !== -1 &&
                        messageIndex > branchPointIndex;
                      const branchFadeKey = isDownstreamOfBranchSwitch
                        ? `${message.id}-${branchSwitchSignal?.tick}`
                        : message.id;
                      const messageAuthor =
                        isUser && showMessageAuthorAvatars
                          ? resolveChatMessageAuthor({
                              metadata: message.metadata,
                              membersById: messageAuthorsById,
                              sessionUser: session?.user,
                            })
                          : null;
                      return (
                        <MessageScrollerItem
                          className="mx-auto w-full max-w-2xl"
                          key={branchFadeKey}
                          messageId={message.id}
                        >
                          <Message
                            className={cn(
                              "group/message relative",
                              isDownstreamOfBranchSwitch &&
                                "chat-branch-fade-in"
                            )}
                            from={message.role}
                          >
                            {isUser ? (
                              <m.div
                                className="ml-auto flex w-full max-w-full items-start justify-end gap-2"
                                layout={!reduceMotion}
                                transition={{
                                  duration: 0.22,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                              >
                                <div className="flex w-full min-w-0 flex-col items-end gap-2">
                                  {userImageParts.length > 0 && (
                                    <UserImageGrid>
                                      {userImageParts.map((part, index) =>
                                        renderPart(part, message.id, index)
                                      )}
                                    </UserImageGrid>
                                  )}
                                  {(isEditing ||
                                    userContentParts.length > 0 ||
                                    userFileParts.length > 0) && (
                                    <UserMessageTextBubble
                                      initialText={toDisplayText(
                                        getUserMessageText(message)
                                      )}
                                      isEditing={isEditing}
                                      onCancel={handleCancelEditMessage}
                                      onSubmit={(text) =>
                                        handleEditMessage(message.id, text)
                                      }
                                    >
                                      {userContentParts.map((part, index) =>
                                        renderPart(part, message.id, index)
                                      )}
                                      {userFileParts.length > 0 && (
                                        <div className="flex max-w-full flex-wrap justify-end gap-2">
                                          {userFileParts.map((part, index) =>
                                            renderPart(part, message.id, index)
                                          )}
                                        </div>
                                      )}
                                    </UserMessageTextBubble>
                                  )}
                                </div>
                                {messageAuthor ? (
                                  <MessageAuthorAvatar author={messageAuthor} />
                                ) : null}
                              </m.div>
                            ) : (
                              <MessageContent>
                                <ChatAssistantParts
                                  activityTimings={
                                    message.metadata?.activityTimings
                                  }
                                  durationMs={
                                    message.metadata?.generationDurationMs
                                  }
                                  elapsedSeconds={
                                    message.id === lastMessage?.id
                                      ? activitySeconds
                                      : undefined
                                  }
                                  isLoading={
                                    (isLoading || isMirrorWorking) &&
                                    message.id === lastAssistantMessageId
                                  }
                                  isStandaloneTool={(part) =>
                                    isContentEditorStandaloneTool(part) ||
                                    (isToolUIPart(part) &&
                                      part.type !== "dynamic-tool" &&
                                      (isCreateTool(part.type) ||
                                        part.type === "tool-createImage"))
                                  }
                                  messageId={message.id}
                                  parts={message.parts}
                                  renderStandalone={(part, index) =>
                                    renderPart(part, message.id, index)
                                  }
                                  renderTool={(part, index) =>
                                    renderPart(part, message.id, index)
                                  }
                                />
                              </MessageContent>
                            )}
                            {isUser && !isSlackMirrored && (
                              <UserMessageActions
                                availableModels={availableModels}
                                branchIndex={
                                  branchTotal > 1 ? branchIdx : undefined
                                }
                                branchTotal={
                                  branchTotal > 1 ? branchTotal : undefined
                                }
                                canInteract={!isLoading}
                                className={messageAuthor ? "pr-10" : undefined}
                                isEditing={isEditing}
                                messageText={toDisplayText(
                                  getUserMessageText(message)
                                )}
                                onEdit={() =>
                                  handleStartEditMessage(message.id)
                                }
                                onNextBranch={() =>
                                  handleSwitchBranch(message.id, "next")
                                }
                                onPreviousBranch={() =>
                                  handleSwitchBranch(message.id, "prev")
                                }
                                onRetry={(model) =>
                                  handleRetryMessage(message.id, model)
                                }
                              />
                            )}
                            {message.role === "assistant" && (
                              <AssistantMetadataHover
                                metadata={message.metadata}
                              />
                            )}
                          </Message>
                        </MessageScrollerItem>
                      );
                    });
                  })()}
                  {wasStoppedByUser && !isLoading && (
                    <div className="mx-auto w-full max-w-2xl">
                      <div className="bg-destructive/10 text-destructive flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs">
                        <HugeiconsIcon className="size-3.5" icon={X} />
                        <span>Response stopped by user</span>
                      </div>
                    </div>
                  )}
                  {chatError && !isLoading && (
                    <div className="mx-auto w-full max-w-2xl">
                      <div className="bg-destructive/10 text-destructive flex w-fit flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
                        <HugeiconsIcon className="size-3.5 shrink-0" icon={X} />
                        <span>{chatError}</span>
                        {!isSlackMirrored && (
                          <button
                            className="focus-visible:ring-ring inline-flex items-center gap-1 rounded font-medium underline-offset-2 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
                            onClick={handleRetryAfterError}
                            type="button"
                          >
                            <HugeiconsIcon
                              className="size-3.5"
                              icon={ArrowReloadHorizontalIcon}
                            />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {showThinkingIndicator && (
                    <div className="mx-auto w-full max-w-2xl">
                      <Message from="assistant">
                        <MessageContent>
                          <span
                            className="text-muted-foreground flex items-center gap-2 text-sm leading-5"
                            role="status"
                          >
                            <ChatActivityStatus
                              active={!isStopping}
                              label={isStopping ? "Stopping" : "Thinking"}
                              seconds={activitySeconds ?? 0}
                            />
                          </span>
                        </MessageContent>
                      </Message>
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <div
            className={cn(
              "bg-background z-10 px-4 pb-4",
              isFirstMessageTransition && "chat-input-slide-down"
            )}
          >
            <div className="mx-auto w-full max-w-2xl min-w-0">
              {isWaitingForActiveStream && (
                <p
                  className="text-muted-foreground mx-auto mb-2 w-full max-w-2xl text-xs"
                  role="status"
                >
                  Waiting for the previous response to finish before sending.
                </p>
              )}
              {isSlackMirrored && (
                <div className="mb-2 flex justify-center">
                  <SlackRelayFooterNotice
                    threadUrl={chatHistoryData?.slackThreadUrl ?? null}
                  />
                </div>
              )}
              {isProjectScopePending ? (
                <ProjectScopeLoadingInput />
              ) : (
                <ChatInputAdvanced
                  availableModels={availableModels}
                  authorsById={messageAuthorsById}
                  context={context}
                  draftStorageKey={draftStorageKey}
                  error={null}
                  initialValue={initialQuery ?? undefined}
                  isLoading={isLoading}
                  isStopping={isStopping}
                  model={effectiveSelectedModel}
                  onAddContext={handleAddContext}
                  onClearError={handleClearError}
                  onEditQueued={handleEditQueued}
                  onModelChange={handleModelChange}
                  onRemoveContext={handleRemoveContext}
                  onRemoveQueued={handleRemoveQueued}
                  onSend={handleSend}
                  onSteerQueued={handleSteerQueued}
                  onStop={handleStop}
                  onThinkingLevelChange={handleThinkingLevelChange}
                  onUpdateQueued={handleUpdateQueued}
                  organizationId={organizationId}
                  organizationSlug={organizationSlug}
                  queuedMessages={queuedMessages}
                  ref={chatInputRef}
                  showAuthorAvatars={showMessageAuthorAvatars}
                  thinkingLevel={thinkingLevel}
                />
              )}
            </div>
          </div>
        </div>
      </LazyMotion>
      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
        open={previewAttachment !== null}
      />
    </>
  );
}

function getPinnedModelFromAutoMetadata(
  metadata: ChatUIMessage["metadata"] | undefined
) {
  if (metadata?.requestedModel !== "auto" || !metadata.model) {
    return null;
  }

  const parsedModel = parseStoredChatModel(metadata.model);
  return parsedModel && parsedModel !== "auto" ? parsedModel : null;
}

export default function PageClient(props: StandaloneChatPageClientProps) {
  return (
    <ChatQuoteProvider key={props.chatId ?? "__new"}>
      <StandaloneChatPageClient
        chatId={props.chatId}
        key={props.chatId ?? "__new"}
        organizationSlug={props.organizationSlug}
      />
    </ChatQuoteProvider>
  );
}
