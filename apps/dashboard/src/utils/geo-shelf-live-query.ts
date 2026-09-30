import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import { GEO_SHELF_EMPTY_BOARD_COUNTS } from "@/constants/geo-shelf";
import type {
  GeoShelfBoardCounts,
  GeoShelfFilterState,
  GeoShelfMember,
  GeoShelfSortState,
  GeoShelfSource,
} from "@/types/geo-shelf";
import { isOpenShelfStatus, resolveShelfPoc } from "@/utils/geo-shelf";

export function getOwnPlacement(source: GeoShelfSource) {
  return (
    source.placements.find((placement) => placement.competitorId === null) ??
    null
  );
}

export function getPresentCompetitorPlacements(source: GeoShelfSource) {
  return source.placements.filter(
    (placement) =>
      placement.competitorId !== null && placement.status === "present"
  );
}

export function isShelfOpportunitySource(source: GeoShelfSource): boolean {
  const ownPlacement = getOwnPlacement(source);
  return (
    source.ownership === "third_party" &&
    ownPlacement?.status !== "present" &&
    getPresentCompetitorPlacements(source).length > 0
  );
}

export function matchesShelfSourceFilter(
  source: GeoShelfSource,
  shelf: GeoShelfFilterState["shelf"]
): boolean {
  switch (shelf) {
    case "opportunities":
      return isShelfOpportunitySource(source);
    case "on_shelf":
      return getOwnPlacement(source)?.status === "present";
    case "unknown":
      return (
        getOwnPlacement(source) === null ||
        getOwnPlacement(source)?.status === "unknown" ||
        source.fetchStatus === "blocked" ||
        source.fetchStatus === "pending"
      );
    default:
      return true;
  }
}

export function matchesTicketSourceFilter(
  source: GeoShelfSource,
  ticket: GeoShelfFilterState["ticket"],
  currentMemberId: string | null
): boolean {
  const opportunity = source.opportunity;
  switch (ticket) {
    case "open":
      return opportunity?.status === "open";
    case "in_progress":
      return opportunity?.status === "in_progress";
    case "mine":
      return (
        currentMemberId !== null &&
        isOpenShelfStatus(opportunity?.status) &&
        (opportunity?.assigneeMemberId === currentMemberId ||
          resolveShelfPoc(opportunity) === currentMemberId)
      );
    case "unassigned":
      return (
        isOpenShelfStatus(opportunity?.status) &&
        opportunity?.assigneeMemberId === null
      );
    case "closed":
      return opportunity !== null && !isOpenShelfStatus(opportunity.status);
    default:
      return true;
  }
}

function competitorNameById(
  competitors: readonly GeoCompetitor[]
): Map<string, string> {
  return new Map(
    competitors.map((competitor) => [competitor.id, competitor.name])
  );
}

export function matchesSourceSearch(
  source: GeoShelfSource,
  search: string,
  members: readonly GeoShelfMember[],
  competitors: readonly GeoCompetitor[]
): boolean {
  const query = search.trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }

  const memberById = new Map(members.map((member) => [member.id, member]));
  const competitorNames = competitorNameById(competitors);
  const ownPlacement = getOwnPlacement(source);
  const assigneeId = source.opportunity?.assigneeMemberId ?? null;

  const haystack = [
    source.title ?? "",
    source.domain,
    source.url,
    ...(ownPlacement?.status === "present" ? [ownPlacement.brandName] : []),
    ...getPresentCompetitorPlacements(source).flatMap((placement) => [
      placement.brandName,
      placement.competitorId
        ? (competitorNames.get(placement.competitorId) ?? "")
        : "",
    ]),
    assigneeId ? (memberById.get(assigneeId)?.name ?? "") : "",
    source.opportunity?.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function shelfSortValue(
  source: GeoShelfSource,
  key: GeoShelfSortState["key"]
): string | number {
  switch (key) {
    case "title":
      return (source.title ?? source.url).toLowerCase();
    case "own":
      return getOwnPlacement(source)?.status ?? "unknown";
    case "ticket":
      return source.opportunity?.status ?? "zz";
    default:
      return source.citations.windowCount;
  }
}

/** JS twin of the page query's `order by`, ties broken by id. */
export function compareGeoShelfSources(
  left: GeoShelfSource,
  right: GeoShelfSource,
  sort: GeoShelfSortState
): number {
  const leftValue = shelfSortValue(left, sort.key);
  const rightValue = shelfSortValue(right, sort.key);
  const compared =
    typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
  if (compared !== 0) {
    return sort.direction === "asc" ? compared : -compared;
  }
  return left.id.localeCompare(right.id);
}

export function countGeoShelfBoardColumns(
  sources: readonly GeoShelfSource[]
): GeoShelfBoardCounts {
  const counts: GeoShelfBoardCounts = { ...GEO_SHELF_EMPTY_BOARD_COUNTS };
  for (const source of sources) {
    counts[source.opportunity?.status ?? "untracked"] += 1;
  }
  return counts;
}

export function matchesGeoShelfSourceFilters(
  source: GeoShelfSource,
  filters: GeoShelfFilterState,
  members: readonly GeoShelfMember[],
  competitors: readonly GeoCompetitor[]
): boolean {
  return (
    matchesShelfSourceFilter(source, filters.shelf) &&
    matchesTicketSourceFilter(
      source,
      filters.ticket,
      filters.currentMemberId
    ) &&
    matchesSourceSearch(source, filters.search, members, competitors)
  );
}
