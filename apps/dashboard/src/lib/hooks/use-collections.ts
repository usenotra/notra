"use client";

import type {
  PostCollectionDetail,
  PostCollectionListResponse,
} from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";

const DEFAULT_PAGE_SIZE = 20;
const GENERATING_POLL_INTERVAL = 4000;

export function useCollections(organizationId: string, page: number) {
  const { projectId, isResolved } = useActiveProject();
  return useQuery<PostCollectionListResponse>({
    ...dashboardOrpc.content.collections.list.queryOptions({
      input: {
        organizationId,
        projectId: projectId ?? undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    }),
    enabled: !!organizationId && isResolved,
    refetchInterval: (query) =>
      query.state.data?.collections.some(
        (collection) => collection.isGenerating
      )
        ? GENERATING_POLL_INTERVAL
        : false,
    meta: { errorMessage: "Failed to load collections" },
  });
}

export function useCollection(organizationId: string, collectionId: string) {
  return useQuery<{ collection: PostCollectionDetail }>({
    ...dashboardOrpc.content.collections.get.queryOptions({
      input: { organizationId, collectionId },
    }),
    enabled: !!organizationId && !!collectionId,
    refetchInterval: (query) =>
      query.state.data?.collection.isGenerating
        ? GENERATING_POLL_INTERVAL
        : false,
    meta: { errorMessage: "Failed to load collection" },
  });
}
