"use client";

import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  GEO_SHELF_EMPTY_BOARD_COUNTS,
  GEO_SHELF_PAGE_SIZE,
} from "@/constants/geo-shelf";
import { geoCollectionId } from "@/lib/db/geo-collections";
import {
  clearRowPending,
  getPendingRows,
  markRowPending,
  subscribeToPendingRows,
} from "@/lib/db/pending-rows";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GeoShelfDbApi,
  GeoShelfFilterState,
  GeoShelfListResponse,
  GeoShelfMember,
  GeoShelfMutationResponse,
  GeoShelfSortState,
  GeoShelfSource,
} from "@/types/geo-shelf";
import { toErrorMessage } from "@/utils/error-message";
import {
  applyShelfOpportunityChanges,
  applyShelfPlacementStatus,
  toShelfOpportunityWrite,
  toShelfPlacementWrites,
} from "@/utils/geo-shelf";
import { matchesGeoShelfSourceFilters } from "@/utils/geo-shelf-live-query";

type GeoShelfListData = InfiniteData<GeoShelfListResponse, number>;

function replaceCachedSource(
  data: GeoShelfListData | undefined,
  sourceId: string,
  update: (source: GeoShelfSource) => GeoShelfSource
): GeoShelfListData | undefined {
  if (!data?.pages) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.sources.some((source) => source.id === sourceId)
        ? {
            ...page,
            sources: page.sources.map((source) =>
              source.id === sourceId ? update(source) : source
            ),
          }
        : page
    ),
  };
}

/**
 * Shelf sources are filtered, sorted and paged on the server. Edits patch
 * every cached page optimistically and refetch once the last one settles, so
 * counts and filter membership catch up without flickering between saves.
 */
export function useGeoShelfSources(
  organizationId: string,
  input: {
    filters: Omit<GeoShelfFilterState, "currentMemberId">;
    currentMemberId: string | null;
    members: readonly GeoShelfMember[];
    competitors: readonly GeoCompetitor[];
    sort: GeoShelfSortState;
    enabled: boolean;
  }
): GeoShelfDbApi {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const pendingKey = geoCollectionId("shelf", { organizationId, projectId });
  const inFlightBySourceId = useRef(new Map<string, number>());
  const queueBySourceId = useRef(new Map<string, Promise<void>>());
  // An optimistic add keeps its temporary id until the next refetch.
  const serverIdByDraftId = useRef(new Map<string, string>());
  const pendingSourceIds = useSyncExternalStore(
    subscribeToPendingRows,
    () => getPendingRows(pendingKey),
    () => getPendingRows(pendingKey)
  );
  const listKey = dashboardOrpc.geo.shelfList.key();

  const options = dashboardOrpc.geo.shelfList.infiniteOptions({
    input: (offset: number) => ({
      organizationId,
      projectId,
      offset,
      limit: GEO_SHELF_PAGE_SIZE,
      search: input.filters.search,
      shelf: input.filters.shelf,
      ticket: input.filters.ticket,
      sortKey: input.sort.key,
      sortDirection: input.sort.direction,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const query = useInfiniteQuery({
    ...options,
    enabled: input.enabled && organizationId.length > 0,
    // Keep the current rows on screen while a filter or sort change loads.
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load shelf space" },
  });

  const pages = query.data?.pages ?? [];
  const firstPage = pages.at(0);

  const resolveSourceId = (sourceId: string) =>
    serverIdByDraftId.current.get(sourceId) ?? sourceId;

  const patchSource = (
    sourceId: string,
    update: (source: GeoShelfSource) => GeoShelfSource
  ) => {
    void queryClient.cancelQueries({ queryKey: listKey });
    queryClient.setQueriesData<GeoShelfListData>(
      { queryKey: listKey },
      (data) => replaceCachedSource(data, sourceId, update)
    );
  };

  const settle = (sourceId: string) => {
    const inFlight = inFlightBySourceId.current;
    const remaining = (inFlight.get(sourceId) ?? 1) - 1;
    if (remaining > 0) {
      inFlight.set(sourceId, remaining);
    } else {
      inFlight.delete(sourceId);
      clearRowPending(pendingKey, sourceId);
    }
    if (inFlight.size === 0) {
      void queryClient.invalidateQueries({ queryKey: listKey });
    }
  };

  /**
   * Saves of one row run one after another, so the server applies them in the
   * order they were made and a slower, older response never lands last.
   */
  const persist = (
    sourceId: string,
    request: (serverId: string) => Promise<GeoShelfMutationResponse>,
    fallbackMessage: string
  ) => {
    const inFlight = inFlightBySourceId.current;
    const queues = queueBySourceId.current;
    inFlight.set(sourceId, (inFlight.get(sourceId) ?? 0) + 1);
    markRowPending(pendingKey, sourceId);
    const run: Promise<void> = (queues.get(sourceId) ?? Promise.resolve())
      .then(() => request(resolveSourceId(sourceId)))
      .then(
        ({ source }) => {
          if (source.id !== sourceId) {
            serverIdByDraftId.current.set(sourceId, source.id);
          }
          // A newer edit of the same row is still queued: keep it on screen.
          if (inFlight.get(sourceId) === 1) {
            patchSource(sourceId, () => source);
          }
        },
        (error: unknown) => {
          toast.error(toErrorMessage(error, fallbackMessage));
        }
      )
      .then(() => {
        settle(sourceId);
        if (queues.get(sourceId) === run) {
          queues.delete(sourceId);
        }
      });
    queues.set(sourceId, run);
  };

  // Member and competitor names count for search, same as on the server.
  const matchesActiveFilters = (source: GeoShelfSource) =>
    matchesGeoShelfSourceFilters(
      source,
      { ...input.filters, currentMemberId: input.currentMemberId },
      input.members,
      input.competitors
    );

  const addSource = (source: GeoShelfSource) => {
    const isVisible = matchesActiveFilters(source);
    void queryClient.cancelQueries({ queryKey: listKey });
    queryClient.setQueryData(options.queryKey, (data) => {
      const [first, ...rest] = data?.pages ?? [];
      if (!data || !first) {
        return data;
      }
      return {
        ...data,
        pages: [
          {
            ...first,
            sources: isVisible ? [source, ...first.sources] : first.sources,
            totalCount: first.totalCount + 1,
            filteredCount: first.filteredCount + (isVisible ? 1 : 0),
          },
          ...rest,
        ],
      };
    });
    persist(
      source.id,
      () =>
        dashboardOrpc.geo.shelfCreate.call({
          organizationId,
          projectId,
          url: source.url,
          title: source.title,
          kind: source.kind,
          placements: toShelfPlacementWrites(source),
          opportunity: toShelfOpportunityWrite(source),
        }),
      "Failed to add shelf"
    );
  };

  const updateOpportunity: GeoShelfDbApi["updateOpportunity"] = (
    sourceId,
    changes
  ) => {
    const nowIso = new Date().toISOString();
    patchSource(resolveSourceId(sourceId), (source) =>
      applyShelfOpportunityChanges(source, changes, nowIso)
    );
    persist(
      sourceId,
      (serverId) =>
        dashboardOrpc.geo.shelfUpdate.call({
          organizationId,
          projectId,
          sourceId: serverId,
          opportunity: changes,
        }),
      "Failed to update ticket"
    );
  };

  const setPlacementStatus: GeoShelfDbApi["setPlacementStatus"] = (
    sourceId,
    competitorId,
    status
  ) => {
    const nowIso = new Date().toISOString();
    patchSource(resolveSourceId(sourceId), (source) =>
      applyShelfPlacementStatus(source, competitorId, status, nowIso)
    );
    persist(
      sourceId,
      (serverId) =>
        dashboardOrpc.geo.shelfUpdate.call({
          organizationId,
          projectId,
          sourceId: serverId,
          placements: [{ competitorId, status }],
        }),
      "Failed to update placement"
    );
  };

  const loadMore = () => {
    // A refetch replaces the pages, so asking for the next one would race it.
    if (query.hasNextPage && !query.isFetching) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  };

  return {
    sources: pages.flatMap((page) => page.sources),
    isLoading: query.isPending,
    isSampleData: firstPage?.isSampleData ?? false,
    totalCount: firstPage?.totalCount ?? 0,
    filteredCount: firstPage?.filteredCount ?? 0,
    boardCounts: firstPage?.boardCounts ?? GEO_SHELF_EMPTY_BOARD_COUNTS,
    hasScanData: firstPage?.hasScanData ?? false,
    hasNextPage: query.hasNextPage,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore,
    pendingSourceIds,
    addSource,
    updateOpportunity,
    setPlacementStatus,
  };
}
