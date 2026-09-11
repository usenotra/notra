"use client";

import type { PostsResponse } from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";

import { DASHBOARD_HOME_POST_LIMIT } from "@/constants/content-preview";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";

const DEFAULT_PAGE_SIZE = 12;

export function usePosts(organizationId: string, page: number, enabled = true) {
  const { projectId, isResolved } = useActiveProject();
  return useQuery<PostsResponse>({
    ...dashboardOrpc.content.list.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    }),
    enabled: enabled && !!organizationId && isResolved,
    meta: { errorMessage: "Failed to load content" },
  });
}

export function useTodayPosts(organizationId: string) {
  const { projectId, isResolved } = useActiveProject();
  return useQuery<PostsResponse>({
    ...dashboardOrpc.content.list.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
        page: 1,
        pageSize: DASHBOARD_HOME_POST_LIMIT,
        date: "today",
      },
    }),
    enabled: !!organizationId && isResolved,
    meta: { errorMessage: "Failed to load today's content" },
  });
}
