import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import type {
  GeoShelfDbApi,
  GeoShelfFilterState,
  GeoShelfMember,
  GeoShelfPageEmpty,
  GeoShelfPageModel,
  GeoShelfPageReady,
  GeoShelfPageStatusInput,
  GeoShelfRow,
  GeoShelfSelection,
  GeoShelfShelfFilter,
  GeoShelfSource,
  GeoShelfTicketFilter,
  GeoShelfView,
} from "@/types/geo-shelf";
import { filterShelfRows, toShelfRows } from "@/utils/geo-shelf";

export function resolveGeoShelfPageStatus(
  input: GeoShelfPageStatusInput
): GeoShelfPageModel["status"] {
  if (input.isSettingsPending || (input.hasSettings && input.isShelfLoading)) {
    return "loading";
  }
  if (!input.hasSettings) {
    return "empty";
  }
  return "ready";
}

export function resolveSelectedShelfRow(
  rows: readonly GeoShelfRow[],
  selected: GeoShelfSelection | null
): GeoShelfRow | null {
  if (!selected) {
    return null;
  }
  return (
    rows.find((row) => row.id === selected.id) ??
    rows.find((row) => row.url === selected.url) ??
    null
  );
}

export function toGeoShelfReadyFields(input: {
  organizationId: string;
  organizationSlug: string;
  companyName: string | undefined;
  ownDomain: string | null;
  competitors: GeoCompetitor[];
  members: GeoShelfMember[] | undefined;
  currentMemberId: string | null | undefined;
  sources: GeoShelfSource[];
  selected: GeoShelfSelection | null;
  search: string;
  shelfFilter: GeoShelfShelfFilter;
  ticketFilter: GeoShelfTicketFilter;
  view: GeoShelfView;
  addOpen: boolean;
  pendingSourceIds: ReadonlySet<string>;
  onSearchChange: GeoShelfPageReady["onSearchChange"];
  onShelfFilterChange: GeoShelfPageReady["onShelfFilterChange"];
  onTicketFilterChange: GeoShelfPageReady["onTicketFilterChange"];
  onViewChange: GeoShelfPageReady["onViewChange"];
  onAddOpenChange: GeoShelfPageReady["onAddOpenChange"];
  onRowClick: GeoShelfPageReady["onRowClick"];
  onSelectedOpenChange: GeoShelfPageReady["onSelectedOpenChange"];
  addSource: GeoShelfDbApi["addSource"];
  updateOpportunity: GeoShelfDbApi["updateOpportunity"];
  setPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
}): Omit<GeoShelfPageReady, "status"> {
  const members = input.members ?? [];
  const currentMemberId = input.currentMemberId ?? null;
  const currentMember =
    members.find((member) => member.id === currentMemberId) ?? null;
  const rows = toShelfRows(input.sources, members);
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
    rows,
    filteredRows: filterShelfRows(rows, filters),
    filters,
    view: input.view,
    hasScanData: input.sources.some((source) => source.origin === "scan"),
    selectedRow: resolveSelectedShelfRow(rows, input.selected),
    addOpen: input.addOpen,
    pendingSourceIds: input.pendingSourceIds,
    onSearchChange: input.onSearchChange,
    onShelfFilterChange: input.onShelfFilterChange,
    onTicketFilterChange: input.onTicketFilterChange,
    onViewChange: input.onViewChange,
    onAddOpenChange: input.onAddOpenChange,
    onRowClick: input.onRowClick,
    onSelectedOpenChange: input.onSelectedOpenChange,
    addSource: input.addSource,
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
