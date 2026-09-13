"use client";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { geoBriefToMarkdown } from "@notra/geo-core/utils/geo-writer-brief-markdown";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ContentDetailSaveToast } from "@/components/content/content-detail-save-bar";
import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { SAVE_BAR_SELECTOR } from "@/constants/content-detail";
import { localStorageKeys } from "@/constants/storage";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoWriterBrief,
  useGeoWriterUpdate,
} from "@/lib/hooks/use-geo-writer";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ImageExportTarget } from "@/types/content/image-export";
import type { ContentApiResponse } from "@/types/hooks/content";
import { extractTitleFromMarkdown } from "@/utils/content-detail";
import {
  isGeoWriterPlanReviewable,
  parseGeoWriterDraft,
} from "@/utils/geo-write-entry";
import { isImageExportTarget } from "@/utils/image-export";
import { getConflictRevision } from "@/utils/orpc-errors";
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
  const isGeoWriterPlanMode = Boolean(
    geoWriterDraft && briefStatus !== "completed"
  );
  const isGeoWriterPlanReviewableNow = isGeoWriterPlanReviewable(briefStatus);
  const isGeoWriterChatLocked =
    Boolean(geoWriterDraft) &&
    !isGeoWriterPlanReviewableNow &&
    briefStatus !== "completed";

  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [persistedTitle, setPersistedTitle] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [imageExportTarget, setImageExportTarget] =
    useState<ImageExportTarget>("paper");
  const [writeFocusNonce, setWriteFocusNonce] = useState(0);
  const [reviewPreviousMarkdown, setReviewPreviousMarkdown] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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
          (t) =>
            createElement(ContentDetailSaveToast, {
              onDismiss: () => {
                toast.dismiss(t);
                saveToastIdRef.current = null;
              },
              onDiscard: () => {
                handleDiscardRef.current?.();
              },
              onSave: () => {
                handleSaveRef.current?.();
              },
            }),
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
          onDiscard: handleDiscard,
          onSave: handleSave,
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
    editedMarkdown,
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
