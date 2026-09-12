"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowReloadHorizontalIcon, X } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  chatTransportRequestInputSchema,
  externalChannelIdSchema,
} from "@notra/ai/schemas/chat";
import type { ContentType } from "@notra/ai/schemas/content";
import type {
  ChatAttachment,
  ChatImageAttachmentProps,
  ChatInputHandle,
  ChatMessagePart,
  ChatUIMessage,
  ContextItem,
  ExternalChannelId,
  MirrorChatStatus,
} from "@notra/ai/types/chat";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@notra/ui/components/ai-elements/message";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@notra/ui/components/ui/message-scroller";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DefaultChatTransport,
  type DynamicToolUIPart,
  getToolName,
  isToolUIPart,
  type ToolUIPart,
} from "ai";
import { LazyMotion, m, useReducedMotion } from "motion/react";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  Children,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ChatReasoningBlock } from "@/components/ai/chat-reasoning-block";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import { getMcpToolServerId } from "@/components/ai/chat-tool-block/mcp/utils";
import { AssistantMetadataHover } from "@/components/chat/assistant-metadata-hover";
import { AttachmentPreviewDialog } from "@/components/chat/attachment-preview";
import {
  ChatInputAdvanced,
  type ThinkingLevel,
} from "@/components/chat/chat-input";
import { ChatQueue, type QueuedMessage } from "@/components/chat/chat-queue";
import { ChatSuggestions } from "@/components/chat/chat-suggestions";
import { renderTextWithIntegrationReferences } from "@/components/chat/integration-reference";
import { MessageAuthorAvatar } from "@/components/chat/message-author-avatar";
import { SlackRelayFooterNotice } from "@/components/chat/slack-relay-footer-notice";
import {
  UserMessageActions,
  UserMessageTextBubble,
} from "@/components/chat/user-message-actions";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { MAX_VISIBLE_CHAT_IMAGES } from "@/constants/chat-images";
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
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed-seconds";
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
import { shouldContinueAfterApprovalResponse } from "@/utils/chat-approvals";
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
import { parseQueuedMessages } from "@/utils/chat-queue";
import {
  clearPendingChatClientState,
  resetNewChatClientState,
  updateWasStoppedByUser,
} from "@/utils/chat-state";
import { formatLongDate, getGreeting } from "@/utils/dashboard-greeting";
import { formatElapsedSeconds } from "@/utils/format-elapsed-seconds";
import {
  getReferenceDisplay,
  parseReferenceValue,
} from "@/utils/integration-reference";
import { getOutputTypeLabel } from "@/utils/output-types";
import { buildPublishedChatMessage } from "@/utils/social-publish";

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
      <BrailleLoader className="text-sm" label="Thinking" />
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

function hasPendingApproval(messages: readonly ChatUIMessage[]): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (isToolUIPart(part) && part.state === "approval-requested") {
        return true;
      }
    }
  }
  return false;
}

function isTerminalToolState(state: string): boolean {
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
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

function ChatImageAttachment({
  url,
  filename,
  mediaType,
  onClick,
}: ChatImageAttachmentProps) {
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (hasError) {
    return (
      <div className="border-border bg-muted/40 text-muted-foreground my-1 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
        <span className="truncate">
          {filename ?? mediaType ?? "Attachment"} is unavailable
        </span>
      </div>
    );
  }

  return (
    <button
      className="border-border bg-muted/40 focus-visible:ring-ring my-1 block w-fit overflow-hidden rounded-lg border transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      onClick={onClick}
      type="button"
    >
      <Image
        alt={filename ?? "attachment"}
        className={cn(
          "duration-slow block h-auto max-h-72 w-auto max-w-full transition-opacity motion-reduce:transition-none",
          hasLoaded ? "opacity-100" : "opacity-0"
        )}
        height={480}
        loading="eager"
        onError={() => setHasError(true)}
        onLoad={() => setHasLoaded(true)}
        src={url}
        unoptimized
        width={640}
      />
    </button>
  );
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
    <div
      aria-label="Loading project"
      className="bg-muted/50 h-24 animate-pulse rounded-xl"
      role="status"
    />
  );
}

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
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
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
  const selectedModelRef = useRef(selectedModel);
  const thinkingLevelRef = useRef(thinkingLevel);

  useEffect(() => {
    contextRef.current = context;
    hasCustomizedContextRef.current = hasCustomizedContext;
    selectedModelRef.current = selectedModel;
    thinkingLevelRef.current = thinkingLevel;
    organizationIdRef.current = organizationId;
  }, [
    context,
    hasCustomizedContext,
    selectedModel,
    thinkingLevel,
    organizationId,
  ]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: `/api/organizations/${organizationId}/chat`,
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            chatId: id,
            projectId: activeProjectId ?? undefined,
            messages: getSendableMessages(messages),
            context: hasCustomizedContextRef.current
              ? contextRef.current
              : undefined,
            model: selectedModelRef.current,
            enableThinking: thinkingLevelRef.current !== "off",
            thinkingLevel: thinkingLevelRef.current,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
        prepareReconnectToStreamRequest: ({ id }) => ({
          api: `/api/organizations/${organizationIdRef.current}/chat/${id}/stream`,
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
          if (!triggerResponse.ok) {
            return triggerResponse;
          }

          const contentType = triggerResponse.headers.get("content-type") ?? "";
          if (contentType.includes("text/event-stream")) {
            return triggerResponse;
          }

          if (!requestBody) {
            return triggerResponse;
          }

          return fetch(
            `/api/organizations/${organizationIdRef.current}/chat/${requestBody.chatId}/stream`,
            {
              method: "GET",
              headers: init?.headers,
              credentials: init?.credentials,
              signal: init?.signal,
            }
          );
        },
      }),
    [activeProjectId, organizationId]
  );

  const [wasStoppedByUser, setWasStoppedByUser] = useState(false);
  const wasStoppedByUserRef = useRef(false);

  const drainQueueRef = useRef<() => void>(() => {
    // Populated after dispatchMessage is defined below.
  });
  const isDrainingRef = useRef(false);

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
      isDrainingRef.current = false;
      drainQueueRef.current();
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
    resume: Boolean(initialChatId && pendingMessageId),
    experimental_throttle: 90,
    transport,
    sendAutomaticallyWhen: shouldContinueAfterApprovalResponse,
    onFinish: handleFinish,
    onError: (err) =>
      handleStandaloneChatError(err, { setChatError, setPendingMessageId }),
  });

  const [isStopping, setIsStopping] = useState(false);

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
      setPendingMessageId(chatHistoryData.activeStreamId);
    } else {
      setPendingMessageId(null);
    }
  }, [chatHistoryData, setMessages]);

  const hasUpdatedUrlRef = useRef(false);
  const hasRunInitialChatIdEffectRef = useRef(false);

  useEffect(() => {
    if (!hasRunInitialChatIdEffectRef.current) {
      hasRunInitialChatIdEffectRef.current = true;
      return;
    }

    if (initialChatId) {
      clearPendingChatClientState({
        setChatError,
        setPendingMessageId,
        setQueuedMessages,
      });
      return;
    }

    resetNewChatClientState({
      hasUpdatedUrlRef,
      setChatError,
      setContext,
      setGeneratedChatId,
      setHasCustomizedContext,
      setMessages,
      setPendingMessageId,
      setQueuedMessages,
      setWasStoppedByUser,
      wasStoppedByUserRef,
    });
  }, [initialChatId, setMessages]);

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
        setQueuedMessages([]);
        return;
      }
      setQueuedMessages(parseQueuedMessages(JSON.parse(raw)));
    } catch {
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
        window.history.replaceState(
          null,
          "",
          `/${organizationSlug}/chat/${stableChatId}`
        );
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
      if (isFirstMessage) {
        queryClient.setQueryData(
          ["chat-history", organizationId, stableChatId],
          {
            messages: messagesRef.current,
            lastResponseStopped: wasStoppedByUserRef.current,
            activeStreamId: null,
            externalChannelId: null,
            slackThreadUrl: null,
          }
        );
        router.replace(`/${organizationSlug}/chat/${stableChatId}`, {
          scroll: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["chat-sessions", organizationId],
        });
      }
    },
    [
      addToolApprovalResponse,
      authorMetadata,
      initialChatId,
      isProjectScopePending,
      isSlackMirrored,
      organizationId,
      organizationSlug,
      queryClient,
      router,
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
      if (isLoading) {
        if (attachments.length > 0) {
          return;
        }
        setQueuedMessages((prev) => [
          ...prev,
          {
            id: nanoid(10),
            text,
            authorUserId: currentAuthorUserId,
          },
        ]);
        return;
      }
      await dispatchMessage(text, attachments);
    },
    [
      currentAuthorUserId,
      dispatchMessage,
      isLoading,
      isSlackMirrored,
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
      resetNewChatClientState({
        hasUpdatedUrlRef,
        setChatError,
        setContext,
        setGeneratedChatId,
        setHasCustomizedContext,
        setMessages,
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
    setMessages,
  ]);

  const handleRemoveQueued = useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleEditQueued = useCallback((message: QueuedMessage) => {
    setQueuedMessages((prev) => prev.filter((m) => m.id !== message.id));
    chatInputRef.current?.setText(message.text);
  }, []);

  const handleUpdateQueued = useCallback((id: string, text: string) => {
    setQueuedMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m))
    );
  }, []);

  const queuedMessagesRef = useRef(queuedMessages);

  useEffect(() => {
    queuedMessagesRef.current = queuedMessages;
  }, [queuedMessages]);

  const seenToolOutputsRef = useRef<Set<string>>(new Set());
  const prevIsLoadingRef = useRef(false);

  useEffect(() => {
    drainQueueRef.current = () => {
      if (isSlackMirrored) {
        return;
      }
      if (isDrainingRef.current) {
        return;
      }
      if (wasStoppedByUserRef.current) {
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
      setQueuedMessages(queue.slice(1));
      dispatchMessage(next.text).catch((error) => {
        console.error("[Chat] Failed to drain queued message:", error);
        isDrainingRef.current = false;
        setQueuedMessages((prev) => [next, ...prev]);
      });
    };
  }, [dispatchMessage, isSlackMirrored]);

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
        <MessageResponse key={`${messageId}-text-${index}`}>
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
      const reasoningState = part.state as "streaming" | "done" | undefined;
      return (
        <ChatReasoningBlock
          isStreaming={isLoading && reasoningState === "streaming"}
          key={reasoningKey}
        >
          {text}
        </ChatReasoningBlock>
      );
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

        const previewState: "draft" | "finished" =
          toolPart.state === "output-available" ||
          toolPart.approval?.reason === "manual-draft" ||
          toolPart.approval?.reason === "manual-published"
            ? "finished"
            : "draft";
        const persistedStatus: "draft" | "published" =
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
                ? relayApproval(approvalId, true)
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
                      contentType,
                      status,
                    }),
                  }
                );
                if (!response.ok) {
                  throw new Error("Failed to save post");
                }
                try {
                  await addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason:
                      status === "published"
                        ? "manual-published"
                        : "manual-draft",
                  });
                } catch (error) {
                  console.error(
                    "[Chat] Failed to mark persisted post approval:",
                    error
                  );
                }
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
              markdown={markdown}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onPersist={handlePersist}
              onRegenerate={handleRegenerate}
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
    return (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="relative flex min-h-full min-w-0 flex-col">
            <div className="flex flex-1 flex-col px-4 pt-6 pb-28">
              <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                </div>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-64 rounded-2xl" />
                </div>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/6" />
                </div>
              </div>
            </div>
            <div className="bg-background sticky bottom-0 z-10 px-4 pb-4">
              <div className="from-background pointer-events-none absolute -inset-x-4 bottom-full h-12 bg-linear-to-t to-transparent" />
              <div className="mx-auto w-full max-w-2xl">
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
    const userName = session?.user?.name?.split(" ")[0];
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
                context={context}
                draftStorageKey={draftStorageKey}
                error={chatError}
                initialValue={initialQuery ?? undefined}
                isLoading={isLoading}
                isStopping={isStopping}
                model={selectedModel}
                onAddContext={handleAddContext}
                onClearError={handleClearError}
                onEmptyChange={setIsInputEmpty}
                onModelChange={handleModelChange}
                onRemoveContext={handleRemoveContext}
                onSend={handleSend}
                onStop={handleStop}
                onThinkingLevelChange={handleThinkingLevelChange}
                onUpdateQueued={handleUpdateQueued}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                queuedMessages={queuedMessages}
                ref={chatInputRef}
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
  const lastAssistantHasNoVisibleContent =
    lastMessage?.role === "assistant" &&
    !lastMessage.parts.some(
      (p) =>
        (p.type === "text" && p.text.trim()) ||
        p.type === "file" ||
        p.type === "reasoning" ||
        isToolUIPart(p)
    );
  const lastPart = lastMessage?.parts.at(-1);
  const isAwaitingAssistantContinuation =
    lastMessage?.role === "assistant" &&
    lastPart != null &&
    (lastPart.type === "step-start" ||
      (isToolUIPart(lastPart) &&
        (isTerminalToolState(lastPart.state) ||
          lastPart.state === "approval-responded")));
  const showThinkingIndicator =
    (isLoading || isMirrorWorking) &&
    lastMessage != null &&
    (lastMessage.role === "user" ||
      lastAssistantHasNoVisibleContent ||
      isAwaitingAssistantContinuation);
  const thinkingIndicatorLabel =
    lastMessage?.role === "user" ? "Getting Started" : "Working";
  const visibleMessages =
    showThinkingIndicator && lastAssistantHasNoVisibleContent
      ? messages.slice(0, -1)
      : messages;

  return (
    <>
      <LazyMotion features={loadMotionFeatures} strict>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport className="min-w-0 overflow-x-hidden">
                <MessageScrollerContent
                  className={cn(
                    "gap-4 px-4 pt-6 pb-6",
                    isFirstMessageTransition && "chat-messages-fade-in"
                  )}
                >
                  {(() => {
                    const branchPointIndex = branchSwitchSignal
                      ? visibleMessages.findIndex(
                          (m) => m.id === branchSwitchSignal.userMessageId
                        )
                      : -1;
                    const lastUserMessageId = [...visibleMessages]
                      .reverse()
                      .find((m) => m.role === "user")?.id;
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
                          scrollAnchor={
                            isUser && message.id === lastUserMessageId
                          }
                        >
                          <Message
                            className={cn(
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
                                {message.parts.map((part, index) =>
                                  renderPart(part, message.id, index)
                                )}
                              </MessageContent>
                            )}
                            {isUser && !isSlackMirrored && (
                              <UserMessageActions
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
                          <BrailleLoader
                            className="text-sm"
                            label={
                              isStopping ? "Stopping" : thinkingIndicatorLabel
                            }
                          />
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
              <ChatQueue
                authorsById={messageAuthorsById}
                messages={queuedMessages}
                onEdit={handleEditQueued}
                onRemove={handleRemoveQueued}
                showAuthorAvatars={showMessageAuthorAvatars}
              />
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
                  connectedTop={queuedMessages.length > 0}
                  context={context}
                  draftStorageKey={draftStorageKey}
                  error={null}
                  initialValue={initialQuery ?? undefined}
                  isLoading={isLoading}
                  isStopping={isStopping}
                  model={selectedModel}
                  onAddContext={handleAddContext}
                  onClearError={handleClearError}
                  onModelChange={handleModelChange}
                  onRemoveContext={handleRemoveContext}
                  onSend={handleSend}
                  onStop={handleStop}
                  onThinkingLevelChange={handleThinkingLevelChange}
                  onUpdateQueued={handleUpdateQueued}
                  organizationId={organizationId}
                  organizationSlug={organizationSlug}
                  queuedMessages={queuedMessages}
                  ref={chatInputRef}
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
    <StandaloneChatPageClient
      chatId={props.chatId}
      key={props.chatId ?? "__new"}
      organizationSlug={props.organizationSlug}
    />
  );
}
