"use client";

import type { RecentPostsResponse } from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { recentPostsQueryInput } from "@/utils/recent-posts-query";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";

export function useRecentPosts(organizationId: string, enabled = true) {
  const tToast = useTranslations("content.toasts");
  const { projectId, isResolved } = useActiveProject();
  return useQuery<RecentPostsResponse>({
    ...dashboardOrpc.content.recents.queryOptions({
      input: recentPostsQueryInput(organizationId, projectId ?? undefined),
    }),
    enabled: enabled && !!organizationId && isResolved,
    meta: { errorMessage: tToast("loadRecentPostsFailed") },
  });
}

export function useDashboardHomeContent(organizationId: string) {
  const tToast = useTranslations("content.toasts");
  const { projectId, isResolved } = useActiveProject();

  return useQuery({
    ...dashboardOrpc.content.home.get.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
      },
    }),
    enabled: !!organizationId && isResolved,
    meta: { errorMessage: tToast("loadDashboardContentFailed") },
  });
}
