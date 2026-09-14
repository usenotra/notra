import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import { GEO_SHELF_SORT_KEYS } from "@notra/schemas/constants/dashboard/geo-shelf";

import { GEO_SHELF_DEFAULT_SORT } from "@/constants/geo-shelf";
import type {
  GeoShelfDbApi,
  GeoShelfFilterState,
  GeoShelfMember,
  GeoShelfPageEmpty,
  GeoShelfPageModel,
  GeoShelfPageReady,
  GeoShelfPageStatusInput,
  GeoShelfShelfFilter,
  GeoShelfSortState,
  GeoShelfSource,
  GeoShelfTicketFilter,
  GeoShelfView,
} from "@/types/geo-shelf";
import { toShelfRows } from "@/utils/geo-shelf";

export function resolveGeoShelfPageStatus(
  input: GeoShelfPageStatusInput
): GeoShelfPageModel["status"] {
  if (
    input.isSettingsPending ||
    (input.hasSettings && (input.isShelfLoading || input.isMembersLoading))
  ) {
    return "loading";
  }
  if (!input.hasSettings) {
    return "empty";
  }
  return "ready";
}

/**
 * The loaded row wins. The snapshot keeps the detail dialog open when an edit
 * moves the row out of the current filter, and the URL fallback survives the
 * id swap after an optimistic add.
 */
export function resolveSelectedShelfSource(
  sources: readonly GeoShelfSource[],
  selected: GeoShelfSource | null
): GeoShelfSource | null {
  if (!selected) {
    return null;
  }
  return (
    sources.find((source) => source.id === selected.id) ??
    sources.find((source) => source.url === selected.url) ??
    selected
  );
}

/** Clearing the table sort falls back to the default instead of no order. */
export function toGeoShelfSortState(
  sort: { key: string; direction: GeoShelfSortState["direction"] } | null
): GeoShelfSortState {
  const key = GEO_SHELF_SORT_KEYS.find((option) => option === sort?.key);
  if (!sort || !key) {
    return GEO_SHELF_DEFAULT_SORT;
  }
  return { key, direction: sort.direction };
}

export function toGeoShelfReadyFields(input: {
  organizationId: string;
  organizationSlug: string;
  companyName: string | undefined;
  ownDomain: string | null;
  competitors: GeoCompetitor[];
  members: GeoShelfMember[] | undefined;
  currentMemberId: string | null | undefined;
  shelf: GeoShelfDbApi;
  selected: GeoShelfSource | null;
  search: string;
  shelfFilter: GeoShelfShelfFilter;
  ticketFilter: GeoShelfTicketFilter;
  sort: GeoShelfSortState;
  view: GeoShelfView;
  addOpen: boolean;
  onSearchChange: GeoShelfPageReady["onSearchChange"];
  onShelfFilterChange: GeoShelfPageReady["onShelfFilterChange"];
  onTicketFilterChange: GeoShelfPageReady["onTicketFilterChange"];
  onSortChange: GeoShelfPageReady["onSortChange"];
  onViewChange: GeoShelfPageReady["onViewChange"];
  onAddOpenChange: GeoShelfPageReady["onAddOpenChange"];
  onRowClick: GeoShelfPageReady["onRowClick"];
  onSelectedOpenChange: GeoShelfPageReady["onSelectedOpenChange"];
  updateOpportunity: GeoShelfDbApi["updateOpportunity"];
  setPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
}): Omit<GeoShelfPageReady, "status"> {
  const members = input.members ?? [];
  const currentMemberId = input.currentMemberId ?? null;
  const currentMember =
    members.find((member) => member.id === currentMemberId) ?? null;
  const { shelf } = input;
  const selectedSource = resolveSelectedShelfSource(
    shelf.sources,
    input.selected
  );
  const filters: GeoShelfFilterState = {
    search: input.search,
    shelf: input.shelfFilter,
    ticket: input.ticketFilter,
    currentMemberId,
  };

  return {
    organizationId: input.organizationId,
    organizationSlug: input.organizationSlug,
    ownBrandName: input.companyName ?? "",
    ownDomain: input.ownDomain,
    competitors: input.competitors,
    members,
    currentMemberId,
    currentMember,
    rows: toShelfRows(shelf.sources, members),
    totalCount: shelf.totalCount,
    filteredCount: shelf.filteredCount,
    boardCounts: shelf.boardCounts,
    hasNextPage: shelf.hasNextPage,
    isFetchingNextPage: shelf.isFetchingNextPage,
    onLoadMore: shelf.loadMore,
    filters,
    sort: input.sort,
    view: input.view,
    hasScanData: shelf.hasScanData,
    selectedRow: selectedSource
      ? (toShelfRows([selectedSource], members).at(0) ?? null)
      : null,
    addOpen: input.addOpen,
    pendingSourceIds: shelf.pendingSourceIds,
    onSearchChange: input.onSearchChange,
    onShelfFilterChange: input.onShelfFilterChange,
    onTicketFilterChange: input.onTicketFilterChange,
    onSortChange: input.onSortChange,
    onViewChange: input.onViewChange,
    onAddOpenChange: input.onAddOpenChange,
    onRowClick: input.onRowClick,
    onSelectedOpenChange: input.onSelectedOpenChange,
    addSource: shelf.addSource,
    updateOpportunity: input.updateOpportunity,
    setPlacementStatus: input.setPlacementStatus,
  };
}

export function toGeoShelfPageModel(input: {
  status: GeoShelfPageModel["status"];
  empty: Omit<GeoShelfPageEmpty, "status">;
  ready: Omit<GeoShelfPageReady, "status">;
}): GeoShelfPageModel {
  if (input.status === "loading") {
    return { status: "loading" };
  }
  if (input.status === "empty") {
    return { status: "empty", ...input.empty };
  }
  return { status: "ready", ...input.ready };
}
