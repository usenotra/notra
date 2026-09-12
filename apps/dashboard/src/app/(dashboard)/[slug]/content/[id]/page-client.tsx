"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowDown01Icon,
  ArrowLeft02Icon,
  Download01Icon,
  SentIcon,
  SidebarRight01Icon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  chatSessionsListResponseSchema,
  uiMessageSchema,
} from "@notra/ai/schemas/chat";
import type {
  ChatSessionSummary,
  ContextItem,
  TextSelection,
} from "@notra/ai/types/chat";
import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import {
  contentChatHistoryPath,
  contentChatHistoryQueryKey,
  contentChatSessionsPath,
  contentChatSessionsQueryKey,
} from "@notra/ai/utils/chat";
import { geoBriefToMarkdown } from "@notra/geo-core/utils/geo-writer-brief-markdown";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { sourceMetadataSchema } from "@notra/schemas/dashboard/content";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { ButtonGroup } from "@notra/ui/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import remend from "remend";
import { toast } from "sonner";

import ChatInput from "@/components/chat-input";
import type { QueuedMessage } from "@/components/chat/chat-queue";
import { getContentTypeLabel } from "@/components/content/content-card";
import { ContentChatActivityPanel } from "@/components/content/content-chat-activity-panel";
import { ContentPlanView } from "@/components/content/content-plan-view";
import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import { ContentEditorSwitch } from "@/components/content/editors";
import { ImageExportTargetIcon } from "@/components/content/image-export-target-icon";
import { PostSocialButton } from "@/components/content/post-social-button";
import { PublishContentToGitHubDialog } from "@/components/content/publish-content-to-github-dialog";
import { RecommendationsSection } from "@/components/content/recommendations-section";
import { RightPanel } from "@/components/dashboard/right-panel";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  CONTENT_TITLE_REGEX,
  SAVE_BAR_SELECTOR,
} from "@/constants/content-detail";
import {
  CONTENT_PLAN_CHAT_PLACEHOLDER,
  CONTENT_PLAN_STAGE_LABEL,
} from "@/constants/content-plan";
import { IMAGE_EXPORT_TARGETS } from "@/constants/image-export";
import { localStorageKeys } from "@/constants/storage";
import { IMAGE_EXPORT_DOWNLOAD_TARGET } from "@/constants/studio-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { emitAutumnRefresh } from "@/lib/billing/autumn-refresh";
import {
  copyImageAsFigma,
  copyImageAsPaper,
  downloadImage,
  preloadImageExportCopy,
} from "@/lib/content/image-export";
import {
  useGeoWriterBrief,
  useGeoWriterUpdate,
} from "@/lib/hooks/use-geo-writer";
import { useImageExportCopyReady } from "@/lib/hooks/use-image-export-copy-ready";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { ContentChatMessageMetadata } from "@/types/content/chat";
import type { ContentDetailPageClientProps } from "@/types/content/detail";
import type { ImageExportTarget } from "@/types/content/image-export";
import { getBrandFaviconUrl } from "@/utils/brand";
import { getEditMarkdownDiff } from "@/utils/chat-document-diff";
import { handleStandaloneChatError } from "@/utils/chat-error";
import { snapshotContentChatAttachments } from "@/utils/content-chat-attachments";
import { formatSnakeCaseLabel } from "@/utils/format";
import {
  isGeoWriterPlanReviewable,
  parseGeoWriterDraft,
} from "@/utils/geo-write-entry";
import { getImageExportHtml, isHttpImageContent } from "@/utils/image-content";
import {
  getImageExportTargetLabel,
  isImageExportTarget,
} from "@/utils/image-export";
import { getConflictRevision } from "@/utils/orpc-errors";
import { shakeElements } from "@/utils/shake-element";

import { useContent } from "../../../../../lib/hooks/use-content";
import { ContentDetailSkeleton } from "./skeleton";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function preloadFigmaAndPaperExport() {
  preloadImageExportCopy("figma");
  preloadImageExportCopy("paper");
}

function extractTitleFromMarkdown(markdown: string): string {
  const match = markdown.match(CONTENT_TITLE_REGEX);
  return match?.[1] ?? "Untitled";
}

function formatLookbackWindow(window: string): string {
  return formatSnakeCaseLabel(window);
}

function formatDateRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function formatTriggerType(type: string): string {
  if (type === "cron") {
    return "Schedule";
  }
  if (type === "github_webhook") {
    return "GitHub Webhook";
  }
  return formatSnakeCaseLabel(type);
}

function formatRepos(repos: { owner: string; repo: string }[]): string {
  if (repos.length === 1 && repos[0]) {
    return `${repos[0].owner}/${repos[0].repo}`;
  }
  return `${repos.length} repositories`;
}

export default function PageClient({
  contentId,
  organizationSlug,
  organizationId,
}: ContentDetailPageClientProps) {
  const { state: sidebarState } = useSidebar();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useContent(organizationId, contentId);
  const geoWriterDraft = parseGeoWriterDraft(data?.content?.sourceMetadata);
  const geoWriterBriefQuery = useGeoWriterBrief(
    organizationId,
    geoWriterDraft?.briefId ?? null
  );
  const geoWriterUpdate = useGeoWriterUpdate(organizationId, contentId);
  const [isPlanDirty, setIsPlanDirty] = useState(false);
  const [hasPlanConflict, setHasPlanConflict] = useState(false);
  const [planEditorVersion, setPlanEditorVersion] = useState(0);
  const briefStatus = geoWriterBriefQuery.data?.status;
  const isGeoWriterPlanMode = Boolean(
    geoWriterDraft && briefStatus !== "completed"
  );
  const isGeoWriterPlanReviewableNow = isGeoWriterPlanReviewable(briefStatus);
  const isGeoWriterChatLocked =
    Boolean(geoWriterDraft) &&
    !isGeoWriterPlanReviewableNow &&
    briefStatus !== "completed";
  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
  const { activeOrganization } = useOrganizationsContext();

  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [persistedTitle, setPersistedTitle] = useState<string | null>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [context, setContext] = useState<ContextItem[]>([]);
  const [chatInputValue, setChatInputValue] = useState("");
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatIdToHydrate, setChatIdToHydrate] = useState<string | null>(null);
  const [imageExportTarget, setImageExportTarget] =
    useState<ImageExportTarget>("paper");
  const imageExportCopyReady = useImageExportCopyReady(
    imageExportTarget,
    data?.content?.contentType === "image"
  );

  const { active, openPanel, closePanel, togglePanel } = useRightPanel();
  const isActivityPanelOpen = active === "content";
  const [writeFocusNonce, setWriteFocusNonce] = useState(0);
  const [reviewPreviousMarkdown, setReviewPreviousMarkdown] = useState<
    string | null
  >(null);
  const saveToastIdRef = useRef<string | number | null>(null);
  const editorRef = useRef<EditorRefHandle | null>(null);
  const imageExportRef = useRef<HTMLDivElement | null>(null);
  const handleSaveRef = useRef<(() => void) | null>(null);
  const handleDiscardRef = useRef<(() => void) | null>(null);
  const needsNormalizationRef = useRef(false);
  const originalMarkdownRef = useRef("");
  const editedMarkdownRef = useRef<string | null>(null);
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
    const storedTarget = window.localStorage.getItem(
      localStorageKeys.imageExportTarget
    );
    if (
      storedTarget &&
      isImageExportTarget(storedTarget) &&
      storedTarget !== "wonder"
    ) {
      setImageExportTarget(storedTarget);
    }
  }, []);

  useEffect(() => {
    if (data?.content && editedMarkdown === null) {
      const nextMarkdown = data.content.markdown ?? "";
      setEditedMarkdown(nextMarkdown);
      setOriginalMarkdown(nextMarkdown);
      originalMarkdownRef.current = nextMarkdown;
      editedMarkdownRef.current = nextMarkdown;
      needsNormalizationRef.current = true;
      setEditorKey((k) => k + 1);
    }
  }, [data, editedMarkdown]);

  useEffect(() => {
    if (
      data?.content?.contentType !== "image" ||
      (data.content.markdown ?? "") === editedMarkdownRef.current
    ) {
      return;
    }

    const nextMarkdown = data.content.markdown ?? "";
    setEditedMarkdown(nextMarkdown);
    setOriginalMarkdown(nextMarkdown);
    originalMarkdownRef.current = nextMarkdown;
    editedMarkdownRef.current = nextMarkdown;
    setEditorKey((k) => k + 1);
  }, [data?.content]);

  const currentMarkdown = editedMarkdown ?? data?.content?.markdown ?? "";
  useEffect(() => {
    setPersistedTitle(data?.content?.title ?? null);
  }, [data?.content?.title]);

  const serverTitle =
    persistedTitle ??
    data?.content?.title ??
    extractTitleFromMarkdown(currentMarkdown);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const title = editingTitle ?? serverTitle;
  const hasTitleChanges =
    editingTitle !== null && editingTitle.trim() !== serverTitle;

  const [persistedSlug, setPersistedSlug] = useState<string | null>(null);
  const serverSlug = persistedSlug ?? data?.content?.slug ?? null;
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const hasSlugChanges =
    editingSlug !== null && editingSlug !== (serverSlug ?? "");

  const hasMarkdownChanges =
    editedMarkdown !== null && editedMarkdown !== originalMarkdown;
  const hasChanges = hasMarkdownChanges || hasTitleChanges || hasSlugChanges;

  const handlePlanBriefChange = useCallback(
    (nextBrief: GeoContentBrief) => {
      const briefId = geoWriterDraft?.briefId;
      const expectedUpdatedAt = geoWriterBriefQuery.data?.updatedAt;
      if (!(briefId && expectedUpdatedAt)) {
        return;
      }
      const markdown = geoBriefToMarkdown(nextBrief);
      geoWriterUpdate.mutate(
        {
          briefId,
          expectedUpdatedAt,
          markdown,
          workingTitle: nextBrief.workingTitle,
        },
        {
          onSuccess: () => {
            setEditedMarkdown(markdown);
            setOriginalMarkdown(markdown);
            originalMarkdownRef.current = markdown;
            editedMarkdownRef.current = markdown;
            queryClient
              .invalidateQueries({
                queryKey: dashboardOrpc.content.get.queryKey({
                  input: { organizationId, contentId },
                }),
              })
              .catch(() => undefined);
          },
          onError: (error) => {
            if (getConflictRevision(error).isConflict) {
              setHasPlanConflict(true);
            }
          },
        }
      );
    },
    [
      contentId,
      geoWriterDraft?.briefId,
      geoWriterBriefQuery.data?.updatedAt,
      geoWriterUpdate,
      organizationId,
      queryClient,
    ]
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleGeoArticleReady = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.get.queryKey({
          input: { organizationId, contentId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.list.key(),
      }),
    ]);
    setEditedMarkdown(null);
    setPersistedSlug(null);
    setEditingTitle(null);
    setEditingSlug(null);
    setReviewPreviousMarkdown(null);
  }, [contentId, organizationId, queryClient]);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      shakeElements(SAVE_BAR_SELECTOR);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      return true;
    }

    setIsSaving(true);
    try {
      const body: Record<string, string | null> = {};
      if (hasTitleChanges) {
        body.title = title.trim();
      }
      if (hasSlugChanges) {
        body.slug = editingSlug?.trim() || null;
      }
      if (editedMarkdown !== null) {
        body.markdown = editedMarkdown;
      }

      const responseData = (await dashboardOrpc.content.update.call({
        organizationId,
        contentId,
        ...body,
      })) as {
        content?: { title?: string; slug?: string | null };
      };

      if (editedMarkdown !== null) {
        setOriginalMarkdown(editedMarkdown);
        originalMarkdownRef.current = editedMarkdown;
      }
      if (reviewPreviousMarkdown) {
        setEditorKey((key) => key + 1);
      }
      setReviewPreviousMarkdown(null);
      setPersistedTitle(responseData.content?.title ?? title.trim());
      setEditingTitle(null);
      setPersistedSlug(responseData.content?.slug ?? null);
      setEditingSlug(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.list.key(),
        }),
      ]);
      toast.success("Content saved");
      setIsSaving(false);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        toast.error("A post with this slug already exists");
      } else if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save content");
      }
      setIsSaving(false);
      return false;
    }
  }, [
    hasChanges,
    hasTitleChanges,
    hasSlugChanges,
    editingSlug,
    title,
    editedMarkdown,
    reviewPreviousMarkdown,
    organizationId,
    contentId,
    queryClient,
  ]);

  const handleDiscard = useCallback(() => {
    setEditedMarkdown(originalMarkdown);
    editedMarkdownRef.current = originalMarkdown;
    editorRef.current?.setMarkdown(originalMarkdown);
    setEditingTitle(null);
    setEditingSlug(null);
    setReviewPreviousMarkdown(null);
    setEditorKey((key) => key + 1);
  }, [originalMarkdown]);

  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const handleToggleStatus = useCallback(async () => {
    const currentStatus = data?.content?.status;
    if (!currentStatus) {
      return;
    }
    setIsTogglingStatus(true);
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await dashboardOrpc.content.update.call({
        organizationId,
        contentId,
        status: newStatus,
      });
      toast.success(
        newStatus === "published" ? "Post published" : "Post moved to drafts"
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.metrics.get.queryKey({
            input: { organizationId },
          }),
        }),
      ]);
    } catch {
      toast.error("Failed to update post status");
    }
    setIsTogglingStatus(false);
  }, [data?.content?.status, organizationId, contentId, queryClient]);

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

  const handleEditorChange = useCallback((markdown: string) => {
    if (
      needsNormalizationRef.current &&
      editedMarkdownRef.current === originalMarkdownRef.current
    ) {
      needsNormalizationRef.current = false;
      setOriginalMarkdown(markdown);
      originalMarkdownRef.current = markdown;
    }
    needsNormalizationRef.current = false;
    setEditedMarkdown(markdown);
    editedMarkdownRef.current = markdown;
  }, []);

  const handleSelectionChange = useCallback((sel: TextSelection | null) => {
    if (sel && sel.text.length > 0) {
      setSelection(sel);
    }
  }, []);

  const [chatError, setChatError] = useState<string | null>(null);
  const drainQueueRef = useRef<() => void>(() => {
    // Populated after dispatchContentEdit is defined below.
  });
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
        editedMarkdownRef.current = fixedMarkdown;
        if (part.type === "tool-editMarkdown") {
          if (
            isGeoWriterPlanReviewableNow &&
            geoWriterDraft?.briefId &&
            geoWriterBriefQuery.data
          ) {
            setReviewPreviousMarkdown(null);
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
                  originalMarkdownRef.current = fixedMarkdown;
                },
              }
            );
          } else {
            setReviewPreviousMarkdown(
              reviewPrevious && reviewPrevious !== fixedMarkdown
                ? reviewPrevious
                : null
            );
            setWriteFocusNonce((value) => value + 1);
            setEditorKey((key) => key + 1);
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
    messages,
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
    [context, dispatchContentEdit, selection]
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

  const saveBarSection =
    hasChanges && isActivityPanelOpen ? (
      <div
        className={`pointer-events-none fixed bottom-4 left-0 z-50 hidden lg:right-96 lg:block ${sidebarState === "collapsed" ? "lg:left-14" : "lg:left-64"}`}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
          <div
            className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm"
            data-save-bar
          >
            <div className="bg-background flex items-center gap-3 rounded-lg py-2 pr-2 pl-4">
              <span className="text-muted-foreground flex-1 text-sm">
                You have unsaved changes
              </span>
              <Button onClick={handleDiscard} size="sm" variant="ghost">
                Discard
              </Button>
              <Button onClick={handleSave} size="sm">
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  const isChatDisabled =
    isGeoWriterChatLocked ||
    !activeChatId ||
    contentChatSessionsQuery.isPending ||
    contentChatHistoryQuery.isFetching ||
    contentChatHistoryQuery.isError;

  const renderChatComposer = () => (
    <>
      <ChatInput
        context={context}
        disabled={isChatDisabled}
        error={chatError}
        isLoading={isAgentBusy}
        onAddContext={handleAddContext}
        onClearError={() => setChatError(null)}
        onClearSelection={clearSelection}
        onEditQueued={handleEditQueued}
        onRemoveContext={handleRemoveContext}
        onRemoveQueued={handleRemoveQueued}
        onSend={handleAiEdit}
        onStop={handleStop}
        onValueChange={setChatInputValue}
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
    <div
      className={`fixed right-0 bottom-0 left-0 mx-auto w-full max-w-2xl px-4 pb-4 md:w-auto ${sidebarState === "collapsed" ? "md:left-14" : "md:left-64"} ${isActivityPanelOpen ? "lg:hidden" : ""}`}
    >
      {renderChatComposer()}
    </div>
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
  const imageExportHtml =
    content.contentType === "image" ? getImageExportHtml(content) : null;
  const imageExportHtmlUrl =
    content.contentType === "image" ? content.htmlUrl : null;
  const imageDownloadUrl =
    content.contentType === "image" && isHttpImageContent(content.content)
      ? content.content
      : null;
  const copyImageExportFor = (target: ImageExportTarget) => {
    trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
      content_id: contentId,
      target,
    });
    if (target === "figma") {
      copyImageAsFigma(
        imageExportRef.current,
        title,
        imageExportHtml,
        imageExportHtmlUrl
      );
      return;
    }

    copyImageAsPaper(
      imageExportRef.current,
      title,
      imageExportHtml,
      imageExportHtmlUrl
    );
  };
  const handleCopyImageExport = () => copyImageExportFor(imageExportTarget);
  const handleImageExportTargetSelect = (value: string) => {
    if (!isImageExportTarget(value) || value === "wonder") {
      return;
    }

    setImageExportTarget(value);
    window.localStorage.setItem(localStorageKeys.imageExportTarget, value);
    copyImageExportFor(value);
  };
  const collection = data.collection;
  const backHref = collection
    ? `/${organizationSlug}/collection/${collection.id}`
    : `/${organizationSlug}/content`;
  const backLabel = collection ? "Back to collection" : "Back to Content";
  const planBrief = geoWriterBriefQuery.data?.brief;
  let mainDocument = (
    <ContentEditorSwitch
      actions={{
        setEditedMarkdown: (markdown) => {
          setEditedMarkdown(markdown);
          if (markdown !== null) {
            editedMarkdownRef.current = markdown;
          }
        },
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
  if (isGeoWriterPlanMode && planBrief) {
    mainDocument = (
      <>
        {hasPlanConflict ? (
          <div
            className="border-border bg-muted/50 mx-auto mb-6 flex w-full max-w-3xl flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div>
              <p className="text-sm font-medium">This plan changed elsewhere</p>
              <p className="text-muted-foreground text-sm">
                Your edits are preserved. Choose which version to keep.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                onClick={async () => {
                  const result = await geoWriterBriefQuery.refetch();
                  if (result.isError) {
                    toast.error("Failed to load the latest plan");
                    return;
                  }
                  setPlanEditorVersion((version) => version + 1);
                  setHasPlanConflict(false);
                }}
                size="sm"
                variant="outline"
              >
                Load latest
              </Button>
              <Button
                onClick={async () => {
                  const result = await geoWriterBriefQuery.refetch();
                  if (result.isError) {
                    toast.error("Failed to refresh the plan");
                    return;
                  }
                  setHasPlanConflict(false);
                }}
                size="sm"
              >
                Save my version
              </Button>
            </div>
          </div>
        ) : null}
        <ContentPlanView
          brief={planBrief}
          isWriting={briefStatus === "writing" || briefStatus === "approved"}
          key={`${geoWriterDraft?.briefId ?? contentId}:${planEditorVersion}`}
          onChange={
            isGeoWriterPlanReviewableNow && !hasPlanConflict
              ? handlePlanBriefChange
              : undefined
          }
          onDirtyChange={
            isGeoWriterPlanReviewableNow ? setIsPlanDirty : undefined
          }
        />
      </>
    );
  } else if (isGeoWriterPlanMode) {
    mainDocument = (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="bg-muted/60 h-4 w-24 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-10 w-3/4 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-16 w-full animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-40 w-full animate-pulse rounded-sm" />
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              href={backHref}
            >
              <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
              {backLabel}
            </Link>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="hidden lg:inline-flex"
                    onClick={() => togglePanel("content")}
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
          >
            {geoWriterDraft ? <WriterExecute.Banner /> : null}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {content.contentType === "blog_post" ? (
                  <p className="text-muted-foreground text-sm">
                    {isGeoWriterPlanMode
                      ? CONTENT_PLAN_STAGE_LABEL
                      : "Blog post"}
                    {content.status === "draft" && !isGeoWriterPlanMode ? (
                      <>
                        {" \u00B7 "}
                        Draft
                      </>
                    ) : null}
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <time
                      className="text-muted-foreground text-sm"
                      dateTime={content.date}
                    >
                      {formatDate(new Date(content.date))}
                    </time>
                    <Badge className="capitalize" variant="secondary">
                      {getContentTypeLabel(content.contentType)}
                    </Badge>
                    {content.contentType !== "image" && (
                      <Badge
                        className="capitalize"
                        variant={
                          content.status === "published" ? "default" : "outline"
                        }
                      >
                        {content.status}
                      </Badge>
                    )}
                  </div>
                )}
                {content.sourceMetadata &&
                  (() => {
                    const parsed = sourceMetadataSchema.safeParse(
                      content.sourceMetadata
                    );
                    if (!parsed.success || !parsed.data) {
                      return null;
                    }
                    const meta = parsed.data;
                    const repositories = meta.repositories ?? [];
                    if (
                      repositories.length === 0 ||
                      !meta.triggerSourceType ||
                      !meta.lookbackWindow ||
                      !meta.lookbackRange
                    ) {
                      return null;
                    }

                    const triggerSourceType = meta.triggerSourceType;
                    const lookbackWindow = meta.lookbackWindow;
                    const lookbackRange = meta.lookbackRange;
                    const repoLabel = formatRepos(repositories);
                    const needsTooltip = repositories.length > 1;
                    return (
                      <p className="text-muted-foreground text-xs">
                        <span className="capitalize">
                          {formatTriggerType(triggerSourceType)}
                        </span>
                        {" \u00B7 "}
                        {needsTooltip ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="cursor-help underline decoration-dotted underline-offset-2">
                                  {repoLabel}
                                </span>
                              }
                            />
                            <TooltipContent>
                              <ul>
                                {repositories.map((r) => (
                                  <li key={`${r.owner}/${r.repo}`}>
                                    {r.owner}/{r.repo}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          repoLabel
                        )}
                        {" \u00B7 "}
                        <span className="capitalize">
                          {formatLookbackWindow(lookbackWindow)}
                        </span>{" "}
                        (
                        {formatDateRange(
                          lookbackRange.start,
                          lookbackRange.end
                        )}
                        )
                        {meta.brandVoiceName &&
                          (() => {
                            const voice = meta.brandVoiceId
                              ? brandResponse?.voices.find(
                                  (v) => v.id === meta.brandVoiceId
                                )
                              : brandResponse?.voices.find(
                                  (v) => v.name === meta.brandVoiceName
                                );
                            return (
                              <>
                                {" \u00B7 "}
                                {voice ? (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <span className="cursor-help underline decoration-dotted underline-offset-2">
                                          {meta.brandVoiceName}
                                        </span>
                                      }
                                    />
                                    <TooltipContent
                                      className="flex items-start gap-3"
                                      side="top"
                                    >
                                      <Avatar
                                        className="mt-0.5 size-8 shrink-0 rounded-full after:rounded-full"
                                        size="sm"
                                      >
                                        <AvatarImage
                                          src={getBrandFaviconUrl(
                                            voice.websiteUrl
                                          )}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {voice.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="space-y-0.5">
                                        <p className="font-medium">
                                          {voice.name}
                                        </p>
                                        {voice.toneProfile && (
                                          <p>Tone: {voice.toneProfile}</p>
                                        )}
                                        {voice.language && (
                                          <p>Language: {voice.language}</p>
                                        )}
                                        {voice.companyName && (
                                          <p>Company: {voice.companyName}</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  meta.brandVoiceName
                                )}
                              </>
                            );
                          })()}
                      </p>
                    );
                  })()}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {(content.contentType === "changelog" ||
                  content.contentType === "blog_post") &&
                  currentMarkdown.trim() !== "" && (
                    <PublishContentToGitHubDialog
                      contentId={contentId}
                      contentType={content.contentType}
                      onSave={handleSave}
                      organizationId={organizationId}
                      organizationSlug={organizationSlug}
                      title={title}
                    />
                  )}
                {isGeoWriterPlanMode ? <WriterExecute.Button /> : null}
                {content.contentType !== "image" && !isGeoWriterPlanMode ? (
                  <Button
                    disabled={isTogglingStatus}
                    onClick={handleToggleStatus}
                    size="sm"
                    variant={content.status === "draft" ? "default" : "outline"}
                  >
                    {(() => {
                      if (isTogglingStatus) {
                        return "Updating...";
                      }
                      return content.status === "published"
                        ? "Move to draft"
                        : "Publish";
                    })()}
                    <HugeiconsIcon
                      className="size-4"
                      icon={
                        content.status === "published" ? TextIcon : SentIcon
                      }
                    />
                  </Button>
                ) : null}
                {content.contentType === "linkedin_post" && (
                  <PostSocialButton
                    content={currentMarkdown}
                    from="editor"
                    onContentChange={setEditedMarkdown}
                    organizationId={organizationId}
                    platform="linkedin"
                  />
                )}
                {content.contentType === "twitter_post" && (
                  <PostSocialButton
                    content={currentMarkdown}
                    from="editor"
                    onContentChange={setEditedMarkdown}
                    organizationId={organizationId}
                    platform="twitter"
                  />
                )}
                {content.contentType === "image" && (
                  <>
                    <Button
                      onClick={() => {
                        trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
                          content_id: contentId,
                          target: IMAGE_EXPORT_DOWNLOAD_TARGET,
                        });
                        downloadImage(imageDownloadUrl, title);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <HugeiconsIcon className="size-4" icon={Download01Icon} />
                      Download image
                    </Button>
                    <ButtonGroup
                      onFocusCapture={() =>
                        preloadImageExportCopy(imageExportTarget)
                      }
                      onMouseEnter={() =>
                        preloadImageExportCopy(imageExportTarget)
                      }
                    >
                      <Button
                        disabled={!imageExportCopyReady}
                        onClick={handleCopyImageExport}
                        size="sm"
                        variant="outline"
                      >
                        <ImageExportTargetIcon
                          className="size-4"
                          target={imageExportTarget}
                        />
                        Copy for {getImageExportTargetLabel(imageExportTarget)}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              onFocus={preloadFigmaAndPaperExport}
                              onMouseEnter={preloadFigmaAndPaperExport}
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <span className="sr-only">Select export target</span>
                          <HugeiconsIcon
                            className="size-4"
                            icon={ArrowDown01Icon}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuRadioGroup
                            onValueChange={handleImageExportTargetSelect}
                            value={imageExportTarget}
                          >
                            {IMAGE_EXPORT_TARGETS.map((target) => {
                              const isWonder = target === "wonder";

                              return (
                                <DropdownMenuRadioItem
                                  className={cn(
                                    "gap-2",
                                    isWonder && "items-start"
                                  )}
                                  closeOnClick
                                  disabled={isWonder}
                                  key={target}
                                  onFocus={() => preloadImageExportCopy(target)}
                                  onMouseEnter={() =>
                                    preloadImageExportCopy(target)
                                  }
                                  value={target}
                                >
                                  <ImageExportTargetIcon
                                    className="mt-0.5 size-4"
                                    target={target}
                                  />
                                  <span className="flex flex-col">
                                    <span>
                                      Copy for{" "}
                                      {getImageExportTargetLabel(target)}
                                    </span>
                                    {isWonder && (
                                      <span className="text-muted-foreground text-xs">
                                        Coming soon
                                      </span>
                                    )}
                                  </span>
                                </DropdownMenuRadioItem>
                              );
                            })}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ButtonGroup>
                  </>
                )}
              </div>
            </div>
          </WriterExecute.Root>

          {mainDocument}

          {isGeoWriterPlanMode ? null : (
            <RecommendationsSection value={content.recommendations} />
          )}

          <div className="h-24" />
        </div>
      </div>
      <RightPanel id="content">
        <ContentChatActivityPanel
          activeChatId={activeChatId}
          isHistoryLoading={
            contentChatSessionsQuery.isPending ||
            contentChatHistoryQuery.isFetching
          }
          messages={messages}
          onClose={() => closePanel("content")}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          sessions={contentChatSessions}
          status={status}
        >
          <div className="shrink-0 p-2 pt-1">{renderChatComposer()}</div>
        </ContentChatActivityPanel>
      </RightPanel>
      {saveBarSection}
      {chatInputSection}
    </>
  );
}
