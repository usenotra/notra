"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import {
  CONTENT_TITLE_REGEX,
  SAVE_BAR_SELECTOR,
} from "@/constants/content-detail";
import { INITIAL_CONTENT_DOCUMENT_STATE } from "@/constants/content-editor-state";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ContentDocumentController,
  UseContentDocumentOptions,
} from "@/types/content/editor-state";
import { contentDocumentReducer } from "@/utils/content-editor-state";
import { shakeElements } from "@/utils/shake-element";

function extractTitleFromMarkdown(markdown: string): string {
  return markdown.match(CONTENT_TITLE_REGEX)?.[1] ?? "Untitled";
}

export function useContentDocument({
  content,
  contentId,
  organizationId,
}: UseContentDocumentOptions): ContentDocumentController {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(
    contentDocumentReducer,
    INITIAL_CONTENT_DOCUMENT_STATE
  );
  const [isSaving, setIsSaving] = useState(false);
  const editorRef =
    useRef<ContentDocumentController["editorRef"]["current"]>(null);
  const needsNormalizationRef = useRef(false);
  const originalMarkdownRef = useRef("");
  const editedMarkdownRef = useRef<string | null>(null);

  useEffect(() => {
    if (content && state.editedMarkdown === null) {
      const markdown = content.markdown ?? "";
      dispatch({ type: "contentLoaded", markdown });
      originalMarkdownRef.current = markdown;
      editedMarkdownRef.current = markdown;
      needsNormalizationRef.current = true;
    }
  }, [content, state.editedMarkdown]);

  useEffect(() => {
    if (
      content?.contentType !== "image" ||
      (content.markdown ?? "") === editedMarkdownRef.current
    ) {
      return;
    }
    const markdown = content.markdown ?? "";
    dispatch({ type: "remoteImageLoaded", markdown });
    originalMarkdownRef.current = markdown;
    editedMarkdownRef.current = markdown;
  }, [content]);

  useEffect(() => {
    dispatch({ type: "serverTitleChanged", title: content?.title ?? null });
  }, [content?.title]);

  const currentMarkdown = state.editedMarkdown ?? content?.markdown ?? "";
  const serverTitle =
    state.persistedTitle ??
    content?.title ??
    extractTitleFromMarkdown(currentMarkdown);
  const title = state.editingTitle ?? serverTitle;
  const serverSlug = state.persistedSlug ?? content?.slug ?? null;
  const hasTitleChanges =
    state.editingTitle !== null && state.editingTitle.trim() !== serverTitle;
  const hasSlugChanges =
    state.editingSlug !== null && state.editingSlug !== (serverSlug ?? "");
  const hasMarkdownChanges =
    state.editedMarkdown !== null &&
    state.editedMarkdown !== state.originalMarkdown;
  const hasChanges = hasMarkdownChanges || hasTitleChanges || hasSlugChanges;

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
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const setEditedMarkdown = useCallback((markdown: string | null) => {
    dispatch({ type: "markdownEdited", markdown });
    if (markdown !== null) {
      editedMarkdownRef.current = markdown;
    }
  }, []);
  const setOriginalMarkdown = useCallback((markdown: string) => {
    dispatch({ type: "markdownBaselineChanged", markdown });
    originalMarkdownRef.current = markdown;
  }, []);
  const setEditingTitle = useCallback((value: string | null) => {
    dispatch({ type: "titleEdited", title: value });
  }, []);
  const setEditingSlug = useCallback((value: string | null) => {
    dispatch({ type: "slugEdited", slug: value });
  }, []);
  const handleEditorChange = useCallback((markdown: string) => {
    if (
      needsNormalizationRef.current &&
      editedMarkdownRef.current === originalMarkdownRef.current
    ) {
      dispatch({ type: "markdownNormalized", markdown });
      originalMarkdownRef.current = markdown;
    }
    needsNormalizationRef.current = false;
    dispatch({ type: "markdownEdited", markdown });
    editedMarkdownRef.current = markdown;
  }, []);
  const replacePersistedMarkdown = useCallback((markdown: string) => {
    dispatch({ type: "markdownNormalized", markdown });
    originalMarkdownRef.current = markdown;
    editedMarkdownRef.current = markdown;
  }, []);
  const applyAgentEdit = useCallback(
    (markdown: string, previous: string | null) => {
      dispatch({ type: "agentEditApplied", markdown, previous });
      editedMarkdownRef.current = markdown;
    },
    []
  );
  const resetForArticle = useCallback(() => {
    dispatch({ type: "articleReady" });
  }, []);
  const clearReview = useCallback(() => {
    dispatch({ type: "reviewCleared" });
  }, []);
  const discard = useCallback(() => {
    dispatch({ type: "discarded" });
    editedMarkdownRef.current = state.originalMarkdown;
    editorRef.current?.setMarkdown(state.originalMarkdown);
  }, [state.originalMarkdown]);

  const save = useCallback(async () => {
    if (!hasChanges) {
      return true;
    }
    const submittedMarkdown = state.editedMarkdown;
    setIsSaving(true);
    const body: Record<string, string | null> = {};
    if (hasTitleChanges) {
      body.title = title.trim();
    }
    if (hasSlugChanges) {
      body.slug = state.editingSlug?.trim() || null;
    }
    if (submittedMarkdown !== null) {
      body.markdown = submittedMarkdown;
    }
    return dashboardOrpc.content.update
      .call({
        organizationId,
        contentId,
        ...body,
      })
      .then(async (response) => {
        if (submittedMarkdown !== null) {
          originalMarkdownRef.current = submittedMarkdown;
        }
        dispatch({
          type: "saveCompleted",
          markdown: submittedMarkdown,
          title: response.content?.title ?? title.trim(),
          slug: response.content?.slug ?? null,
          submittedTitle: state.editingTitle,
          submittedSlug: state.editingSlug,
        });
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
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          toast.error("A post with this slug already exists");
        } else if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to save content");
        }
        setIsSaving(false);
        return false;
      });
  }, [
    contentId,
    hasChanges,
    hasSlugChanges,
    hasTitleChanges,
    organizationId,
    queryClient,
    state.editedMarkdown,
    state.editingSlug,
    state.editingTitle,
    title,
  ]);

  return {
    ...state,
    currentMarkdown,
    editorRef,
    editedMarkdownRef,
    clearReview,
    hasChanges,
    hasMarkdownChanges,
    hasSlugChanges,
    hasTitleChanges,
    isSaving,
    serverSlug,
    serverTitle,
    title,
    applyAgentEdit,
    discard,
    handleEditorChange,
    replacePersistedMarkdown,
    resetForArticle,
    save,
    setEditedMarkdown,
    setEditingSlug,
    setEditingTitle,
    setOriginalMarkdown,
  };
}
