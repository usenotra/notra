"use client";

import type { PostStatus } from "@notra/schemas/dashboard/content";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { dashboardOrpc } from "../orpc/query";

/**
 * Delete and publish actions for a post, shared by every surface that lists
 * posts (cards, sidebar) so the toasts and cache invalidations stay identical.
 */
export function usePostActions(organizationId: string) {
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
          toast.success("Post deleted");
          await invalidateLists();
          return true;
        })
        .catch(() => {
          toast.error("Failed to delete post");
          return false;
        })
        .finally(() => {
          setIsDeleting(false);
        });
    },
    [invalidateLists, organizationId]
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
              ? "Post published"
              : "Post moved to drafts"
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
          toast.error("Failed to update post status");
          return false;
        })
        .finally(() => {
          setIsTogglingStatus(false);
        });
    },
    [invalidateLists, organizationId, queryClient]
  );

  return { deletePost, isDeleting, isTogglingStatus, togglePostStatus };
}
