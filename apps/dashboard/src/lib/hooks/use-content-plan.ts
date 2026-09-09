"use client";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { geoBriefToMarkdown } from "@notra/geo-core/utils/geo-writer-brief-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  useGeoWriterBrief,
  useGeoWriterUpdate,
} from "@/lib/hooks/use-geo-writer";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseContentPlanOptions } from "@/types/content/detail-document";
import {
  isGeoWriterPlanReviewable,
  parseGeoWriterDraft,
} from "@/utils/geo-write-entry";
import { getConflictRevision } from "@/utils/orpc-errors";

export function useContentPlan({
  organizationId,
  contentId,
  sourceMetadata,
  replacePersistedMarkdown,
  resetForArticle,
}: UseContentPlanOptions) {
  const queryClient = useQueryClient();
  const draft = parseGeoWriterDraft(sourceMetadata);
  const briefQuery = useGeoWriterBrief(organizationId, draft?.briefId ?? null);
  const update = useGeoWriterUpdate(organizationId, contentId);
  const [isDirty, setIsDirty] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const status = briefQuery.data?.status;
  const isPlanMode = Boolean(draft && status !== "completed");
  const isReviewable = isGeoWriterPlanReviewable(status);
  const isChatLocked =
    Boolean(draft) && !isReviewable && status !== "completed";

  const onBriefChange = useCallback(
    (nextBrief: GeoContentBrief) => {
      const briefId = draft?.briefId;
      const expectedUpdatedAt = briefQuery.data?.updatedAt;
      if (!(briefId && expectedUpdatedAt)) {
        return;
      }
      const markdown = geoBriefToMarkdown(nextBrief);
      update.mutate(
        {
          briefId,
          expectedUpdatedAt,
          markdown,
          workingTitle: nextBrief.workingTitle,
        },
        {
          onSuccess: () => {
            replacePersistedMarkdown(markdown);
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
              setHasConflict(true);
            }
          },
        }
      );
    },
    [
      draft?.briefId,
      briefQuery.data?.updatedAt,
      update,
      replacePersistedMarkdown,
      queryClient,
      organizationId,
      contentId,
    ]
  );

  const onArticleReady = useCallback(async () => {
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
    resetForArticle();
  }, [contentId, organizationId, queryClient, resetForArticle]);

  const onLoadLatest = useCallback(async () => {
    const result = await briefQuery.refetch();
    if (result.isError) {
      toast.error("Failed to load the latest plan");
      return;
    }
    setEditorVersion((version) => version + 1);
    setHasConflict(false);
  }, [briefQuery]);

  const onSaveVersion = useCallback(async () => {
    const result = await briefQuery.refetch();
    if (result.isError) {
      toast.error("Failed to refresh the plan");
      return;
    }
    setHasConflict(false);
  }, [briefQuery]);

  return {
    draft,
    briefQuery,
    update,
    isDirty,
    setIsDirty,
    hasConflict,
    editorVersion,
    status,
    isWriting: status === "writing" || status === "approved",
    isPlanMode,
    isReviewable,
    isChatLocked,
    onBriefChange,
    onArticleReady,
    onLoadLatest,
    onSaveVersion,
  };
}
