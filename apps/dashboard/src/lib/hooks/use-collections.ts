"use client";

import type {
  PostCollectionDetail,
  PostCollectionListResponse,
} from "@notra/schemas/dashboard/content";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { dashboardOrpc } from "../orpc/query";
import { useActiveProject } from "./use-active-project";
import { useScopedPreviousData } from "./use-scoped-previous-data";

const GENERATING_POLL_INTERVAL = 4000;

export function useCollections(
  organizationId: string,
  page: number,
  pageSize: number,
  initialProjectId: string | null
) {
  const tToast = useTranslations("content.toasts");
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
        pageSize,
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
    meta: { errorMessage: tToast("loadCollectionsFailed") },
  });
}

export function useCollection(organizationId: string, collectionId: string) {
  const tToast = useTranslations("content.toasts");
  return useQuery<{ collection: PostCollectionDetail }>({
    ...dashboardOrpc.content.collections.get.queryOptions({
      input: { organizationId, collectionId },
    }),
    enabled: !!organizationId && !!collectionId,
    refetchInterval: (query) =>
      query.state.data?.collection.isGenerating
        ? GENERATING_POLL_INTERVAL
        : false,
    meta: { errorMessage: tToast("loadCollectionFailed") },
  });
}
