"use client";

import type {
  PostCollectionDetail,
  PostCollectionListResponse,
} from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";

import { CONTENT_COLLECTION_PAGE_SIZE } from "@/constants/content-collections";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";

const GENERATING_POLL_INTERVAL = 4000;

export function useCollections(
  organizationId: string,
  page: number,
  serverProject?: { id: string | undefined }
) {
  const { projectId: activeProjectId, isResolved } = useActiveProject();
  // The server already resolved the project and prefetched this key. Waiting
  // for the client project list used to hold the collections query behind it.
  const projectId = isResolved
    ? (activeProjectId ?? undefined)
    : serverProject?.id;
  return useQuery<PostCollectionListResponse>({
    ...dashboardOrpc.content.collections.list.queryOptions({
      input: {
        organizationId,
        projectId,
        page,
        pageSize: CONTENT_COLLECTION_PAGE_SIZE,
      },
    }),
    enabled: !!organizationId && (isResolved || serverProject !== undefined),
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
