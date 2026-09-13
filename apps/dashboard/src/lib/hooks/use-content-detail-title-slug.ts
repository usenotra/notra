"use client";

import { useEffect, useState } from "react";

import { extractTitleFromMarkdown } from "@/utils/content-detail";

interface UseContentDetailTitleSlugParams {
  contentTitle: string | undefined;
  contentSlug: string | null | undefined;
  currentMarkdown: string;
}

export function useContentDetailTitleSlug({
  contentTitle,
  contentSlug,
  currentMarkdown,
}: UseContentDetailTitleSlugParams) {
  const [persistedTitle, setPersistedTitle] = useState<string | null>(null);
  const [persistedSlug, setPersistedSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  useEffect(() => {
    setPersistedTitle(contentTitle ?? null);
  }, [contentTitle]);

  const serverTitle =
    persistedTitle ?? contentTitle ?? extractTitleFromMarkdown(currentMarkdown);
  const title = editingTitle ?? serverTitle;
  const hasTitleChanges =
    editingTitle !== null && editingTitle.trim() !== serverTitle;

  const serverSlug = persistedSlug ?? contentSlug ?? null;
  const hasSlugChanges =
    editingSlug !== null && editingSlug !== (serverSlug ?? "");

  return {
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
  };
}
