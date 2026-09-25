"use client";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { isGeoBriefMarkdown } from "@notra/geo-core/utils/geo-writer-brief-markdown";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import {
  CONTENT_AUTOSAVE_MS,
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

function linkedPublishForContent(
  content: ContentApiResponse["content"] | undefined
) {
  if (
    content?.contentType !== "changelog" &&
    content?.contentType !== "blog_post"
  ) {
    return null;
  }
  return content.githubPublish;
}

export function useContentDetailDocument({
  organizationId,
  contentId,
  data,
}: UseContentDetailDocumentParams) {
  const queryClient = useQueryClient();

  const geoWriterDraft = parseGeoWriterDraft(data?.content?.sourceMetadata);
  const geoWriterBriefQuery = useGeoWriterBrief(
    organizationId,
    geoWriterDraft?.briefId ?? null,
    geoWriterDraft?.projectId
  );
  const geoWriterUpdate = useGeoWriterUpdate(
    organizationId,
    contentId,
    geoWriterDraft?.projectId
  );

  const [isPlanDirty, setIsPlanDirty] = useState(false);
  const [hasPlanConflict, setHasPlanConflict] = useState(false);
  const [planEditorVersion, setPlanEditorVersion] = useState(0);
  const briefStatus = geoWriterBriefQuery.data?.status;
  const serverMarkdown = data?.content?.markdown ?? "";
  const {
    isBriefError: isGeoWriterBriefError,
    isChatLocked: isGeoWriterChatLocked,
    isPlanMode: isGeoWriterPlanMode,
    isPlanReviewable: isGeoWriterPlanReviewableNow,
  } = getGeoWriterDocumentState(
    Boolean(geoWriterDraft),
    geoWriterBriefQuery.error,
    briefStatus,
    isGeoBriefMarkdown(serverMarkdown)
  );

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
  const [saveFailed, setSaveFailed] = useState(false);
  const [loadedArticleBriefId, setLoadedArticleBriefId] = useState<
    string | null
  >(null);
  const [pendingArticleBriefId, setPendingArticleBriefId] = useState<
    string | null
  >(null);
  const geoWriterBriefId = geoWriterDraft?.briefId;
  if (
    geoWriterBriefId &&
    briefStatus &&
    briefStatus !== "completed" &&
    pendingArticleBriefId !== geoWriterBriefId
  ) {
    setPendingArticleBriefId(geoWriterBriefId);
  }
  const isGeoArticleLoading = Boolean(
    geoWriterDraft &&
    briefStatus === "completed" &&
    pendingArticleBriefId === geoWriterDraft.briefId &&
    loadedArticleBriefId !== geoWriterDraft.briefId
  );
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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
    setEditingSlug: setEditingSlugState,
    setEditingTitle: setEditingTitleState,
    setPersistedSlug,
    setPersistedTitle,
    title,
  } = useContentDetailTitleSlug({
    contentTitle: data?.content?.title,
    contentSlug: data?.content?.slug,
    currentMarkdown,
  });

  const setEditingTitle = useCallback(
    (nextTitle: string | null) => {
      setSaveFailed(false);
      setEditingTitleState(nextTitle);
    },
    [setEditingTitleState]
  );
  const setEditingSlug = useCallback(
    (nextSlug: string | null) => {
      setSaveFailed(false);
      setEditingSlugState(nextSlug);
    },
    [setEditingSlugState]
  );
  const setEditedMarkdownAndRetry = useCallback((markdown: string | null) => {
    setSaveFailed(false);
    setEditedMarkdown(markdown);
  }, []);

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

  const handleGeoArticleReady = useCallback(
    async function refreshGeoArticle() {
      if (pendingArticleBriefId !== geoWriterDraft?.briefId) {
        return;
      }
      try {
        const [article] = await Promise.all([
          queryClient.fetchQuery({
            ...dashboardOrpc.content.get.queryOptions({
              input: { organizationId, contentId },
            }),
            staleTime: 0,
          }),
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.content.list.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: dashboardOrpc.content.recents.key(),
          }),
        ]);
        setEditedMarkdown(null);
        setOriginalMarkdown("");
        editedMarkdownRef.current = article.content.markdown ?? "";
        originalMarkdownRef.current = article.content.markdown ?? "";
        setPersistedSlug(null);
        setEditingTitleState(null);
        setEditingSlugState(null);
        setReviewPreviousMarkdown(null);
        needsNormalizationRef.current = true;
        setEditorKey((key) => key + 1);
      } catch {
        toast.error(
          "Couldn't refresh the article. Showing the cached content.",
          {
            action: {
              label: "Retry",
              onClick: () => {
                refreshGeoArticle();
              },
            },
          }
        );
      }
      setLoadedArticleBriefId(geoWriterDraft?.briefId ?? null);
    },
    [
      contentId,
      geoWriterDraft?.briefId,
      pendingArticleBriefId,
      organizationId,
      queryClient,
      setEditingSlugState,
      setEditingTitleState,
      setPersistedSlug,
    ]
  );

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

  const linkedGitHubPublish = linkedPublishForContent(data?.content);

  const handleSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!hasChanges) {
        return true;
      }

      const silent = options?.silent === true;
      const markdownToSave = resolvedEditedMarkdown;
      const titleToSave = title;
      const slugToSave = editingSlug;

      setIsSaving(true);
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

        const markClean = () => {
          setOriginalMarkdown(markdownToSave);
          originalMarkdownRef.current = markdownToSave;
          if (editedMarkdownRef.current === markdownToSave) {
            setEditedMarkdown(markdownToSave);
          }
          if (reviewPreviousMarkdown && !silent) {
            setEditorKey((key) => key + 1);
            setReviewPreviousMarkdown(null);
          }
          setPersistedTitle(persistedTitle);
          setEditingTitleState((current) =>
            current === null || current === titleToSave ? null : current
          );
          setPersistedSlug(persistedSlug);
          setEditingSlugState((current) =>
            current === null || current === slugToSave ? null : current
          );
          setSaveFailed(false);
        };

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
            markClean();
            toast.success("Pull request updated", {
              position: CONTENT_SAVE_TOAST_POSITION,
            });
          } catch (error) {
            const message =
              error instanceof Error && error.message
                ? error.message
                : "Couldn't update the linked pull request";
            toast.error(message, {
              position: CONTENT_SAVE_TOAST_POSITION,
            });
            setSaveFailed(true);
            setIsSaving(false);
            return false;
          }
        } else {
          markClean();
          if (!silent) {
            toast.success("Content saved", {
              position: CONTENT_SAVE_TOAST_POSITION,
            });
          }
        }
        setIsSaving(false);
        return true;
      } catch (error) {
        toast.error(getSaveContentDetailErrorMessage(error), {
          position: CONTENT_SAVE_TOAST_POSITION,
        });
        setSaveFailed(true);
        setIsSaving(false);
        return false;
      }
    },
    [
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
      setEditingSlugState,
      setEditingTitleState,
      setPersistedSlug,
      setPersistedTitle,
      linkedGitHubPublish,
      data?.content?.contentType,
    ]
  );

  useEffect(() => {
    if (
      !hasChanges ||
      isSaving ||
      saveFailed ||
      linkedGitHubPublish ||
      reviewPreviousMarkdown
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSave({ silent: true });
    }, CONTENT_AUTOSAVE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    editingSlug,
    handleSave,
    hasChanges,
    isSaving,
    linkedGitHubPublish,
    saveFailed,
    resolvedEditedMarkdown,
    reviewPreviousMarkdown,
    title,
  ]);

  useHotkey(
    "Mod+S",
    () => {
      void handleSave();
    },
    { enabled: hasChanges && !isSaving }
  );

  const handleDiscard = useCallback(() => {
    needsNormalizationRef.current = false;
    setEditedMarkdown(null);
    setOriginalMarkdown("");
    editedMarkdownRef.current = resolvedOriginalMarkdown;
    editorRef.current?.setMarkdown(resolvedOriginalMarkdown);
    setEditingTitleState(null);
    setEditingSlugState(null);
    setReviewPreviousMarkdown(null);
    setSaveFailed(false);
    setEditorKey((key) => key + 1);
  }, [resolvedOriginalMarkdown, setEditingSlugState, setEditingTitleState]);

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
    setSaveFailed(false);
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
          queryKey: dashboardOrpc.content.recents.key(),
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
    isSaving,
    saveFailed,
    isGeoArticleLoading,
    originalMarkdown,
    originalMarkdownRef,
    planEditorVersion,
    resolvePlanConflictLoadLatest,
    resolvePlanConflictSaveMine,
    reviewPreviousMarkdown,
    setEditedMarkdown: setEditedMarkdownAndRetry,
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
