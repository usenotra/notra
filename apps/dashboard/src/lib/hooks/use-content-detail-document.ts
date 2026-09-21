"use client";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import {
  CONTENT_SAVE_TOAST_POSITION,
  SAVE_BAR_SELECTOR,
} from "@/constants/content-detail";
import { localStorageKeys } from "@/constants/storage";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  getSaveContentDetailErrorMessage,
  saveContentDetail,
  toggleContentDetailStatus,
} from "@/lib/content/save-content-detail";
import { updateGeoWriterPlan } from "@/lib/content/update-geo-writer-plan";
import { useContentDetailSaveToast } from "@/lib/hooks/use-content-detail-save-toast";
import { useContentDetailTitleSlug } from "@/lib/hooks/use-content-detail-title-slug";
import {
  useGeoWriterBrief,
  useGeoWriterUpdate,
} from "@/lib/hooks/use-geo-writer";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ImageExportTarget } from "@/types/content/image-export";
import type { ContentApiResponse } from "@/types/hooks/content";
import {
  getGeoWriterDocumentState,
  parseGeoWriterDraft,
} from "@/utils/geo-write-entry";
import { isImageExportTarget } from "@/utils/image-export";
import { shakeElements } from "@/utils/shake-element";

interface UseContentDetailDocumentParams {
  organizationId: string;
  contentId: string;
  data: ContentApiResponse | undefined;
}

export function useContentDetailDocument({
  organizationId,
  contentId,
  data,
}: UseContentDetailDocumentParams) {
  const { state: sidebarState } = useSidebar();
  const queryClient = useQueryClient();
  const { active } = useRightPanel();
  const isActivityPanelOpen = active === "content";

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
  const {
    isBriefError: isGeoWriterBriefError,
    isChatLocked: isGeoWriterChatLocked,
    isPlanMode: isGeoWriterPlanMode,
    isPlanReviewable: isGeoWriterPlanReviewableNow,
  } = getGeoWriterDocumentState(
    Boolean(geoWriterDraft),
    geoWriterBriefQuery.error,
    briefStatus
  );

  const serverMarkdown = data?.content?.markdown ?? "";
  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [imageExportTarget, setImageExportTarget] =
    useState<ImageExportTarget>("paper");
  const [writeFocusNonce, setWriteFocusNonce] = useState(0);
  const [reviewPreviousMarkdown, setReviewPreviousMarkdown] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [githubSyncError, setGithubSyncError] = useState<string | null>(null);

  const editorRef = useRef<EditorRefHandle | null>(null);
  const imageExportRef = useRef<HTMLDivElement | null>(null);
  const needsNormalizationRef = useRef(true);
  const originalMarkdownRef = useRef("");
  const editedMarkdownRef = useRef<string | null>(null);
  const resolvedEditedMarkdown = editedMarkdown ?? serverMarkdown;
  const resolvedOriginalMarkdown = originalMarkdown || serverMarkdown;
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
    originalMarkdownRef.current = resolvedOriginalMarkdown;
    editedMarkdownRef.current = resolvedEditedMarkdown;
  }, [resolvedEditedMarkdown, resolvedOriginalMarkdown]);

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

  const currentMarkdown = resolvedEditedMarkdown;
  const {
    editingSlug,
    editingTitle,
    hasSlugChanges,
    hasTitleChanges,
    serverSlug,
    serverTitle,
    setEditingSlug,
    setEditingTitle,
    setPersistedSlug,
    setPersistedTitle,
    title,
  } = useContentDetailTitleSlug({
    contentTitle: data?.content?.title,
    contentSlug: data?.content?.slug,
    currentMarkdown,
  });

  const hasMarkdownChanges =
    resolvedEditedMarkdown !== resolvedOriginalMarkdown;
  const hasChanges = hasMarkdownChanges || hasTitleChanges || hasSlugChanges;

  const handlePlanBriefChange = useCallback(
    (nextBrief: GeoContentBrief) => {
      const briefId = geoWriterDraft?.briefId;
      const expectedUpdatedAt = geoWriterBriefQuery.data?.updatedAt;
      if (!(briefId && expectedUpdatedAt)) {
        return;
      }
      updateGeoWriterPlan({
        briefId,
        expectedUpdatedAt,
        nextBrief,
        organizationId,
        contentId,
        queryClient,
        geoWriterUpdate,
        onSuccess: (markdown) => {
          setEditedMarkdown(markdown);
          setOriginalMarkdown(markdown);
          originalMarkdownRef.current = markdown;
          editedMarkdownRef.current = markdown;
        },
        onConflict: () => {
          setHasPlanConflict(true);
        },
      });
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
    setOriginalMarkdown("");
    setPersistedSlug(null);
    setEditingTitle(null);
    setEditingSlug(null);
    setReviewPreviousMarkdown(null);
  }, [
    contentId,
    organizationId,
    queryClient,
    setEditingSlug,
    setEditingTitle,
    setPersistedSlug,
  ]);

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

  const linkedGitHubPublish =
    data?.content?.contentType === "changelog" ||
    data?.content?.contentType === "blog_post"
      ? data.content.githubPublish
      : null;

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      return true;
    }

    setIsSaving(true);
    setGithubSyncError(null);
    try {
      const { persistedTitle, persistedSlug } = await saveContentDetail({
        organizationId,
        contentId,
        queryClient,
        hasTitleChanges,
        hasSlugChanges,
        title,
        editingSlug,
        editedMarkdown: resolvedEditedMarkdown,
      });

      setEditedMarkdown(null);
      setOriginalMarkdown("");
      originalMarkdownRef.current = resolvedEditedMarkdown;
      editedMarkdownRef.current = null;
      if (reviewPreviousMarkdown) {
        setEditorKey((key) => key + 1);
      }
      setReviewPreviousMarkdown(null);
      setPersistedTitle(persistedTitle);
      setEditingTitle(null);
      setPersistedSlug(persistedSlug);
      setEditingSlug(null);
      if (
        linkedGitHubPublish &&
        (data?.content?.contentType === "changelog" ||
          data?.content?.contentType === "blog_post")
      ) {
        try {
          const result =
            await dashboardOrpc.content.publishChangelogToGitHub.call({
              organizationId,
              contentId,
              contentType: data.content.contentType,
              repositoryId: linkedGitHubPublish.repositoryId,
              linkedOnly: true,
            });
          queryClient.setQueryData<ContentApiResponse>(
            dashboardOrpc.content.get.queryKey({
              input: { organizationId, contentId },
            }),
            (current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                content: {
                  ...current.content,
                  githubPublish: {
                    branchName: result.branchName,
                    owner: linkedGitHubPublish.owner,
                    path: result.path,
                    pullRequestNumber: result.pullRequestNumber,
                    pullRequestUrl: result.pullRequestUrl,
                    repo: linkedGitHubPublish.repo,
                    repositoryId: linkedGitHubPublish.repositoryId,
                  },
                },
              };
            }
          );
          toast.success("Pull request updated", {
            position: CONTENT_SAVE_TOAST_POSITION,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Couldn't update the linked pull request";
          setGithubSyncError(message);
          toast.error(message, {
            position: CONTENT_SAVE_TOAST_POSITION,
          });
        }
      } else {
        toast.success("Content saved", {
          position: CONTENT_SAVE_TOAST_POSITION,
        });
      }
      setIsSaving(false);
      return true;
    } catch (error) {
      toast.error(getSaveContentDetailErrorMessage(error), {
        position: CONTENT_SAVE_TOAST_POSITION,
      });
      setIsSaving(false);
      return false;
    }
  }, [
    hasChanges,
    hasTitleChanges,
    hasSlugChanges,
    editingSlug,
    title,
    resolvedEditedMarkdown,
    reviewPreviousMarkdown,
    organizationId,
    contentId,
    queryClient,
    setEditingSlug,
    setEditingTitle,
    setPersistedSlug,
    setPersistedTitle,
    linkedGitHubPublish,
    data?.content?.contentType,
  ]);

  useHotkey(
    "Mod+S",
    () => {
      void handleSave();
    },
    { enabled: hasChanges && !isSaving }
  );

  const handleDiscard = useCallback(() => {
    setEditedMarkdown(null);
    setOriginalMarkdown("");
    editedMarkdownRef.current = resolvedOriginalMarkdown;
    editorRef.current?.setMarkdown(resolvedOriginalMarkdown);
    setEditingTitle(null);
    setEditingSlug(null);
    setReviewPreviousMarkdown(null);
    setEditorKey((key) => key + 1);
  }, [resolvedOriginalMarkdown, setEditingSlug, setEditingTitle]);

  const handleToggleStatus = useCallback(async () => {
    const currentStatus = data?.content?.status;
    if (!currentStatus) {
      return;
    }
    setIsTogglingStatus(true);
    try {
      await toggleContentDetailStatus({
        organizationId,
        contentId,
        queryClient,
        currentStatus,
      });
    } catch {
      toast.error("Failed to update post status");
    }
    setIsTogglingStatus(false);
  }, [data?.content?.status, organizationId, contentId, queryClient]);

  useContentDetailSaveToast({
    hasChanges,
    isSaving,
    isActivityPanelOpen,
    onDiscard: handleDiscard,
    onSave: handleSave,
    saveLabel: linkedGitHubPublish ? "Save and update PR" : "Save",
    savingLabel: linkedGitHubPublish ? "Updating PR..." : "Saving...",
  });

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
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.list.key(),
        }),
      ]),
    [contentId, organizationId, queryClient]
  );

  const handleImageExportTargetSelect = useCallback((value: string) => {
    if (!isImageExportTarget(value) || value === "wonder") {
      return;
    }
    setImageExportTarget(value);
    window.localStorage.setItem(localStorageKeys.imageExportTarget, value);
  }, []);

  const saveBarProps =
    hasChanges && isActivityPanelOpen
      ? {
          sidebarOffsetClass:
            sidebarState === "collapsed" ? "lg:left-14" : "lg:left-64",
          isSaving,
          onDiscard: handleDiscard,
          onSave: handleSave,
          saveLabel: linkedGitHubPublish ? "Save and update PR" : "Save",
          savingLabel: linkedGitHubPublish ? "Updating PR..." : "Saving...",
        }
      : null;

  const resolvePlanConflictLoadLatest = useCallback(async () => {
    const result = await geoWriterBriefQuery.refetch();
    if (result.isError) {
      toast.error("Failed to load the latest plan");
      return;
    }
    setPlanEditorVersion((version) => version + 1);
    setHasPlanConflict(false);
  }, [geoWriterBriefQuery]);

  const resolvePlanConflictSaveMine = useCallback(async () => {
    const result = await geoWriterBriefQuery.refetch();
    if (result.isError) {
      toast.error("Failed to refresh the plan");
      return;
    }
    setHasPlanConflict(false);
  }, [geoWriterBriefQuery]);

  return {
    briefStatus,
    currentMarkdown,
    editedMarkdown: resolvedEditedMarkdown,
    editedMarkdownRef,
    editorKey,
    editorRef,
    geoWriterBriefQuery,
    geoWriterDraft,
    geoWriterUpdate,
    handleDiscard,
    githubSyncError,
    handleEditorChange,
    handleGeoArticleReady,
    handleImageExportTargetSelect,
    handlePlanBriefChange,
    handleSave,
    handleToggleStatus,
    setEditorKey,
    hasChanges,
    hasMarkdownChanges,
    hasPlanConflict,
    hasSlugChanges,
    hasTitleChanges,
    imageExportRef,
    imageExportTarget,
    invalidateContentQueries,
    isGeoWriterBriefError,
    isGeoWriterChatLocked,
    isGeoWriterPlanMode,
    isGeoWriterPlanReviewableNow,
    isPlanDirty,
    isTogglingStatus,
    originalMarkdown,
    originalMarkdownRef,
    planEditorVersion,
    resolvePlanConflictLoadLatest,
    resolvePlanConflictSaveMine,
    reviewPreviousMarkdown,
    saveBarProps,
    setEditedMarkdown,
    setEditingSlug,
    setEditingTitle,
    setIsPlanDirty,
    setOriginalMarkdown,
    setReviewPreviousMarkdown,
    setWriteFocusNonce,
    editingSlug,
    editingTitle,
    serverSlug,
    serverTitle,
    title,
    writeFocusNonce,
  };
}

export type ContentDetailDocument = ReturnType<typeof useContentDetailDocument>;
