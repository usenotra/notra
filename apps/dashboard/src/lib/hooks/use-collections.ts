"use client";

import type {
  PostCollectionDetail,
  PostCollectionListResponse,
} from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";

import { COLLECTIONS_PAGE_SIZE } from "@/constants/content-collections";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";
import { useScopedPreviousData } from "./use-scoped-previous-data";

const GENERATING_POLL_INTERVAL = 4000;

export function useCollections(
  organizationId: string,
  page: number,
  initialProjectId: string | null
) {
  const { projectId, isResolved } = useActiveProject();
  // The server already resolved the same project the switcher will settle on.
  // Waiting for the projects collection first made the list a second round trip.
  const scopedProjectId = isResolved
    ? (projectId ?? undefined)
    : (initialProjectId ?? undefined);
  const placeholderData = useScopedPreviousData<PostCollectionListResponse>(
    `${organizationId}:${scopedProjectId ?? ""}`
  );
  return useQuery<PostCollectionListResponse>({
    ...dashboardOrpc.content.collections.list.queryOptions({
      input: {
        organizationId,
        projectId: scopedProjectId,
        page,
        pageSize: COLLECTIONS_PAGE_SIZE,
      },
    }),
    enabled: !!organizationId && (isResolved || initialProjectId !== undefined),
    placeholderData,
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
