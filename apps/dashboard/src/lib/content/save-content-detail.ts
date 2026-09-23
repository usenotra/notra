import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";

interface SaveContentDetailParams {
  organizationId: string;
  contentId: string;
  queryClient: QueryClient;
  hasTitleChanges: boolean;
  hasSlugChanges: boolean;
  title: string;
  editingSlug: string | null;
  editedMarkdown: string | null;
}

export async function saveContentDetail({
  organizationId,
  contentId,
  queryClient,
  hasTitleChanges,
  hasSlugChanges,
  title,
  editingSlug,
  editedMarkdown,
}: SaveContentDetailParams) {
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
      queryKey: dashboardOrpc.content.recents.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.content.collections.list.key(),
    }),
  ]);

  return {
    persistedTitle: responseData.content?.title ?? title.trim(),
    persistedSlug: responseData.content?.slug ?? null,
  };
}

export function getSaveContentDetailErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("already exists")) {
    return "A post with this slug already exists";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to save content";
}

interface ToggleContentDetailStatusParams {
  organizationId: string;
  contentId: string;
  queryClient: QueryClient;
  currentStatus: string;
}

export async function toggleContentDetailStatus({
  organizationId,
  contentId,
  queryClient,
  currentStatus,
}: ToggleContentDetailStatusParams) {
  const newStatus = currentStatus === "published" ? "draft" : "published";

  await dashboardOrpc.content.update.call({
    organizationId,
    contentId,
    status: newStatus,
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
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.content.recents.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.content.collections.list.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.content.metrics.get.queryKey({
        input: { organizationId },
      }),
    }),
  ]);

  toast.success(
    newStatus === "published" ? "Post published" : "Post moved to drafts"
  );
}
