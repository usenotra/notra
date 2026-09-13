import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import type {
  GeoShelfFilterState,
  GeoShelfMember,
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
