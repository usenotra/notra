"use client";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
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
  const queryClient = useQueryClient();

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
        ]);
        setEditedMarkdown(null);
        setOriginalMarkdown("");
        editedMarkdownRef.current = article.content.markdown ?? "";
        originalMarkdownRef.current = article.content.markdown ?? "";
        setPersistedSlug(null);
        setEditingTitle(null);
        setEditingSlug(null);
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
      setEditingSlug,
      setEditingTitle,
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

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      return true;
    }

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
      toast.success("Content saved", {
        position: CONTENT_SAVE_TOAST_POSITION,
      });
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
    isGeoArticleLoading,
    originalMarkdown,
    originalMarkdownRef,
    planEditorVersion,
    resolvePlanConflictLoadLatest,
    resolvePlanConflictSaveMine,
    reviewPreviousMarkdown,
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
