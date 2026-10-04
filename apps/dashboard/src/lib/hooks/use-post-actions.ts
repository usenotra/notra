"use client";

import type { PostStatus } from "@notra/schemas/dashboard/content";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { dashboardOrpc } from "../orpc/query";

/**
 * Shared post and collection actions keep toasts and list caches consistent.
 */
export function usePostActions(organizationId: string) {
  const tToast = useTranslations("content.toasts");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const invalidateLists = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.recents.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.home.get.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.metrics.get.queryKey({
            input: { organizationId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.get.key(),
        }),
      ]),
    [organizationId, queryClient]
  );

  const deletePost = useCallback(
    (contentId: string) => {
      setIsDeleting(true);
      return dashboardOrpc.content.delete
        .call({ organizationId, contentId })
        .then(async () => {
          toast.success(tToast("postDeleted"));
          await invalidateLists();
          return true;
        })
        .catch(() => {
          toast.error(tToast("deletePostFailed"));
          return false;
        })
        .finally(() => {
          setIsDeleting(false);
        });
    },
    [invalidateLists, organizationId, tToast]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      setIsDeleting(true);
      return dashboardOrpc.content.collections.delete
        .call({ organizationId, collectionId })
        .then(async () => {
          toast.success(tToast("collectionDeleted"));
          await invalidateLists();
          return true;
        })
        .catch(() => {
          toast.error(tToast("deleteCollectionFailed"));
          return false;
        })
        .finally(() => {
          setIsDeleting(false);
        });
    },
    [invalidateLists, organizationId, tToast]
  );

  const togglePostStatus = useCallback(
    (contentId: string, status: PostStatus) => {
      setIsTogglingStatus(true);
      const nextStatus = status === "published" ? "draft" : "published";
      return dashboardOrpc.content.update
        .call({
          organizationId,
          contentId,
          status: nextStatus,
        })
        .then(async () => {
          toast.success(
            nextStatus === "published"
              ? tCommon("labels.postPublished")
              : tToast("postMovedToDrafts")
          );
          await Promise.all([
            invalidateLists(),
            queryClient.invalidateQueries({
              queryKey: dashboardOrpc.content.get.queryKey({
                input: { organizationId, contentId },
              }),
            }),
          ]);
          return true;
        })
        .catch(() => {
          toast.error(tToast("updatePostStatusFailed"));
          return false;
        })
        .finally(() => {
          setIsTogglingStatus(false);
        });
    },
    [invalidateLists, organizationId, queryClient, tToast, tCommon]
  );

  return {
    deletePost,
    deleteCollection,
    isDeleting,
    isTogglingStatus,
    togglePostStatus,
  };
}
