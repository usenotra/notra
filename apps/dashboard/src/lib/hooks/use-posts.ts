"use client";

import type { PostsResponse } from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";

const DEFAULT_PAGE_SIZE = 12;

export function usePosts(
  organizationId: string,
  page: number,
  enabled = true,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const { projectId, isResolved } = useActiveProject();
  return useQuery<PostsResponse>({
    ...dashboardOrpc.content.list.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
        page,
        pageSize,
      },
    }),
    enabled: enabled && !!organizationId && isResolved,
    meta: { errorMessage: "Failed to load content" },
  });
}

export function useDashboardHomeContent(organizationId: string) {
  const { projectId, isResolved } = useActiveProject();

  return useQuery({
    ...dashboardOrpc.content.home.get.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
      },
    }),
    enabled: !!organizationId && isResolved,
    meta: { errorMessage: "Failed to load dashboard content" },
  });
}
