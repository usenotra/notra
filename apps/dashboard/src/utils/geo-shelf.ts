import type { GeoCompetitor } from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import {
  canonicalizeShelfUrl,
  isAllowedShelfUrl,
  shelfDomainFromUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import {
  GEO_SHELF_BOARD_COLUMN_IDS_BY_TICKET_FILTER,
  GEO_SHELF_BOARD_COLUMNS,
  GEO_SHELF_OPEN_STATUSES,
} from "@/constants/geo-shelf";
import { emptyShelfCitations } from "@/lib/geo-shelf/citations";

import type {
  GeoShelfBoardColumnId,
  GeoShelfBoardItems,
  GeoShelfFilterState,
  GeoShelfMember,
  GeoShelfNewSourceDraft,
  GeoShelfOpportunity,
  GeoShelfOpportunityPatch,
  GeoShelfOpportunityWrite,
  GeoShelfPlacement,
  GeoShelfPlacementBrand,
  GeoShelfPlacementWrite,
  GeoShelfRow,
  GeoShelfSource,
} from "../types/geo-shelf";
import {
  getOwnPlacement,
  getPresentCompetitorPlacements,
  isShelfOpportunitySource,
} from "./geo-shelf-live-query";

/** Demo rows from `buildGeoShelfFixture`; they are not stored, so comments cannot attach. */
export function isGeoShelfFixtureSourceId(id: string) {
  return id.startsWith("shelf-src-");
}

export function isOpenShelfStatus(
  status: GeoShelfOpportunity["status"] | null | undefined
): boolean {
  return status ? GEO_SHELF_OPEN_STATUSES.includes(status) : false;
}

export function resolveShelfPoc(
  opportunity: GeoShelfOpportunity | null
): string | null {
  if (!opportunity) {
    return null;
  }
  return opportunity.pocMemberId ?? opportunity.assigneeMemberId;
}

export function boardColumnForRow(row: GeoShelfRow): GeoShelfBoardColumnId {
  return row.opportunity?.status ?? "untracked";
}

export function groupRowsByBoardColumn(
  rows: GeoShelfRow[]
): Record<GeoShelfBoardColumnId, GeoShelfRow[]> {
  const grouped: Record<GeoShelfBoardColumnId, GeoShelfRow[]> = {
    untracked: [],
    open: [],
    in_progress: [],
    won: [],
    lost: [],
    dismissed: [],
  };
  for (const row of rows) {
    grouped[boardColumnForRow(row)].push(row);
  }
  return grouped;
}

const SHELF_BOARD_COLUMN_IDS: GeoShelfBoardColumnId[] = [
  "untracked",
  "open",
  "in_progress",
  "won",
  "lost",
  "dismissed",
];

const SHELF_BOARD_COLUMN_ID_SET = new Set<string>(SHELF_BOARD_COLUMN_IDS);

export function isShelfBoardColumnId(id: string): id is GeoShelfBoardColumnId {
  return SHELF_BOARD_COLUMN_ID_SET.has(id);
}

export function boardColumnsForTicketFilter(
  ticket: GeoShelfFilterState["ticket"]
): typeof GEO_SHELF_BOARD_COLUMNS {
  const allowed = new Set<string>(
    GEO_SHELF_BOARD_COLUMN_IDS_BY_TICKET_FILTER[ticket]
  );
  return GEO_SHELF_BOARD_COLUMNS.filter((column) => allowed.has(column.id));
}

function emptyShelfBoardItems(): GeoShelfBoardItems {
  return {
    untracked: [],
    open: [],
    in_progress: [],
    won: [],
    lost: [],
    dismissed: [],
  };
}

function shelfBoardItemsFromGrouped(
  grouped: Record<GeoShelfBoardColumnId, GeoShelfRow[]>
): GeoShelfBoardItems {
  const items = emptyShelfBoardItems();
  for (const columnId of SHELF_BOARD_COLUMN_IDS) {
    items[columnId] = grouped[columnId].map((row) => row.id);
  }
  return items;
}

export function applyShelfBoardOrder(
  grouped: Record<GeoShelfBoardColumnId, GeoShelfRow[]>,
  order: GeoShelfBoardItems | null
): GeoShelfBoardItems {
  const incoming = shelfBoardItemsFromGrouped(grouped);
  if (!order) {
    return incoming;
  }
  const next = emptyShelfBoardItems();
  for (const columnId of SHELF_BOARD_COLUMN_IDS) {
    const incomingIds = new Set(incoming[columnId]);
    const kept = order[columnId].filter((id) => incomingIds.has(id));
    const keptIds = new Set(kept);
    const added = incoming[columnId].filter((id) => !keptIds.has(id));
    next[columnId] = [...kept, ...added];
  }
  return next;
}

export function findShelfBoardContainer(
  id: string,
  items: GeoShelfBoardItems
): GeoShelfBoardColumnId | null {
  if (isShelfBoardColumnId(id)) {
    return id;
  }
  for (const columnId of SHELF_BOARD_COLUMN_IDS) {
    if (items[columnId].includes(id)) {
      return columnId;
    }
  }
  return null;
}

function arrayMoveIds(ids: string[], from: number, to: number): string[] {
  const next = ids.slice();
  const [item] = next.splice(from, 1);
  if (!item) {
    return ids;
  }
  next.splice(to, 0, item);
  return next;
}

export function moveShelfBoardItem(
  items: GeoShelfBoardItems,
  activeId: string,
  overId: string,
  pointerBelowOverItem: boolean
): GeoShelfBoardItems | null {
  const activeContainer = findShelfBoardContainer(activeId, items);
  const overContainer = findShelfBoardContainer(overId, items);
  if (!activeContainer || !overContainer) {
    return null;
  }

  const activeItems = items[activeContainer];
  const activeIndex = activeItems.indexOf(activeId);
  if (activeIndex < 0) {
    return null;
  }

  if (activeContainer === overContainer) {
    const overIndex = isShelfBoardColumnId(overId)
      ? activeItems.length - 1
      : activeItems.indexOf(overId);
    if (overIndex < 0 || activeIndex === overIndex) {
      return null;
    }
    return {
      ...items,
      [activeContainer]: arrayMoveIds(activeItems, activeIndex, overIndex),
    };
  }

  const overItems = items[overContainer];
  let insertIndex = overItems.length;
  if (!isShelfBoardColumnId(overId)) {
    const overIndex = overItems.indexOf(overId);
    if (overIndex >= 0) {
      insertIndex = overIndex + (pointerBelowOverItem ? 1 : 0);
    }
  }

  return {
    ...items,
    [activeContainer]: activeItems.filter((id) => id !== activeId),
    [overContainer]: [
      ...overItems.slice(0, insertIndex),
      activeId,
      ...overItems.slice(insertIndex),
    ],
  };
}

export function toShelfRows(
  sources: GeoShelfSource[],
  members: GeoShelfMember[]
): GeoShelfRow[] {
  const memberById = new Map(members.map((member) => [member.id, member]));
  return sources.map((source) => {
    const ownPlacement = getOwnPlacement(source);
    const competitorPlacements = source.placements.filter(
      (placement) => placement.competitorId !== null
    );
    const presentCompetitors = getPresentCompetitorPlacements(source);
    const assigneeId = source.opportunity?.assigneeMemberId ?? null;
    const pocId = resolveShelfPoc(source.opportunity);
    return {
      ...source,
      ownPlacement,
      competitorPlacements,
      presentCompetitors,
      isOpportunity: isShelfOpportunitySource(source),
      assignee: assigneeId ? (memberById.get(assigneeId) ?? null) : null,
      poc: pocId ? (memberById.get(pocId) ?? null) : null,
    };
  });
}

export function mergeShelfOpportunity(
  existing: GeoShelfOpportunity | null,
  changes: Partial<GeoShelfOpportunityWrite>,
  nowIso: string
): GeoShelfOpportunity {
  const base: GeoShelfOpportunity = existing ?? {
    id: crypto.randomUUID(),
    status: "open",
    priority: null,
    assigneeMemberId: null,
    pocMemberId: null,
    notes: null,
    dueAt: null,
    createdByUserId: null,
    resolvedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const next: GeoShelfOpportunity = { ...base, ...changes, updatedAt: nowIso };
  // Like the server, a point of contact equal to the assignee is not stored.
  if (next.pocMemberId !== null && next.pocMemberId === next.assigneeMemberId) {
    next.pocMemberId = null;
  }
  next.resolvedAt = isOpenShelfStatus(next.status)
    ? null
    : (base.resolvedAt ?? nowIso);
  return next;
}

export function toShelfPlacementWrites(
  source: GeoShelfSource
): GeoShelfPlacementWrite[] {
  return source.placements.map((placement) => ({
    competitorId: placement.competitorId,
    status: placement.status,
  }));
}

export function applyShelfOpportunityChanges(
  source: GeoShelfSource,
  changes: GeoShelfOpportunityPatch,
  nowIso: string
): GeoShelfSource {
  return {
    ...source,
    opportunity: mergeShelfOpportunity(source.opportunity, changes, nowIso),
    updatedAt: nowIso,
  };
}

/**
 * Sources only store competitors with a known status. Those come first, then
 * every other tracked competitor as "unknown" so it can still be set by hand.
 */
export function withUncheckedCompetitors(
  placements: readonly GeoShelfPlacement[],
  competitors: readonly GeoCompetitor[]
): GeoShelfPlacement[] {
  const stored = placements.filter(
    (placement) => placement.competitorId !== null
  );
  const storedIds = new Set(stored.map((placement) => placement.competitorId));
  const unchecked = competitors.flatMap<GeoShelfPlacement>((competitor) =>
    storedIds.has(competitor.id)
      ? []
      : [
          {
            competitorId: competitor.id,
            brandName: competitor.name,
            brandDomain: competitor.domain,
            status: "unknown",
            position: null,
            hasLink: false,
            evidence: "manual",
            excerpt: null,
            checkedAt: "",
          },
        ]
  );
  return [...stored, ...unchecked];
}

export function applyShelfPlacementStatus(
  source: GeoShelfSource,
  competitorId: string | null,
  status: GeoShelfPlacement["status"],
  nowIso: string,
  brand?: GeoShelfPlacementBrand
): GeoShelfSource {
  const isStored = source.placements.some(
    (placement) => placement.competitorId === competitorId
  );
  // Mirrors the server: a cleared competitor is dropped, not stored.
  if (competitorId !== null && status === "unknown") {
    return isStored
      ? {
          ...source,
          placements: source.placements.filter(
            (placement) => placement.competitorId !== competitorId
          ),
          updatedAt: nowIso,
        }
      : source;
  }
  // Competitors nobody has checked yet are not stored on the source.
  if (!isStored) {
    if (!brand) {
      return source;
    }
    return {
      ...source,
      placements: [
        ...source.placements,
        {
          competitorId,
          brandName: brand.name,
          brandDomain: brand.domain,
          status,
          position: null,
          hasLink: false,
          evidence: "manual",
          excerpt: null,
          checkedAt: nowIso,
        },
      ],
      updatedAt: nowIso,
    };
  }
  return {
    ...source,
    placements: source.placements.map((placement) => {
      if (placement.competitorId !== competitorId) {
        return placement;
      }
      const isPresent = status === "present";
      return {
        ...placement,
        status,
        evidence: "manual",
        checkedAt: nowIso,
        position: isPresent ? placement.position : null,
        hasLink: isPresent ? placement.hasLink : false,
      };
    }),
    updatedAt: nowIso,
  };
}

export function toShelfOpportunityWrite(
  source: GeoShelfSource
): GeoShelfOpportunityWrite | null {
  const opportunity = source.opportunity;
  if (!opportunity) {
    return null;
  }
  return {
    status: opportunity.status,
    priority: opportunity.priority,
    assigneeMemberId: opportunity.assigneeMemberId,
    pocMemberId: opportunity.pocMemberId,
    notes: opportunity.notes,
    dueAt: opportunity.dueAt,
  };
}

/** Canonicalize like the server so the optimistic row matches the created one. */
function optimisticShelfUrl(raw: string): { url: string; domain: string } {
  if (isAllowedShelfUrl(raw)) {
    const url = canonicalizeShelfUrl(raw);
    return { url, domain: shelfDomainFromUrl(url) };
  }
  // The server rejects this URL as well: keep the raw value so the failed
  // insert rolls back with an error toast instead of throwing on submit.
  const trimmed = raw.trim();
  return { url: trimmed, domain: trimmed };
}

export function buildOptimisticShelfSource(
  draft: GeoShelfNewSourceDraft,
  context: {
    ownBrandName: string;
    ownDomain: string | null;
    competitors: GeoCompetitor[];
    createdByUserId: string | null;
  }
): GeoShelfSource {
  const nowIso = new Date().toISOString();
  const { url, domain } = optimisticShelfUrl(draft.url);
  const presentIds = new Set(draft.presentCompetitorIds);
  const placements: GeoShelfPlacement[] = [
    {
      competitorId: null,
      brandName: context.ownBrandName,
      brandDomain: context.ownDomain,
      status: draft.ownPresent ? "present" : "absent",
      position: null,
      hasLink: false,
      evidence: "manual",
      excerpt: null,
      checkedAt: nowIso,
    },
    // Like the server, only competitors with a known status are stored.
    ...context.competitors.flatMap<GeoShelfPlacement>((competitor) =>
      presentIds.has(competitor.id)
        ? [
            {
              competitorId: competitor.id,
              brandName: competitor.name,
              brandDomain: competitor.domain,
              status: "present",
              position: null,
              hasLink: false,
              evidence: "manual",
              excerpt: null,
              checkedAt: nowIso,
            },
          ]
        : []
    ),
  ];
  const title = draft.title.trim();
  return {
    id: crypto.randomUUID(),
    url,
    domain,
    title: title.length > 0 ? title : null,
    kind: draft.kind,
    ownership: "third_party",
    origin: "manual",
    fetchStatus: "pending",
    lastFetchedAt: null,
    citations: emptyShelfCitations(),
    placements,
    opportunity: mergeShelfOpportunity(null, draft.opportunity, nowIso),
    createdByUserId: context.createdByUserId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function shelfMemberInitial(member: GeoShelfMember): string {
  return (member.name || member.email).charAt(0).toUpperCase();
}

export function formatShelfDate(iso: string | null, locale: string): string {
  if (!iso) {
    return "-";
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatShelfDueDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function shelfDueDateToIso(date: Date): string {
  const noon = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  );
  return noon.toISOString();
}

/**
 * One entry per engine family: several models of the same provider would
 * otherwise repeat the same logo. `models` keeps the exact engine ids.
 */
export function groupShelfCitationEngines(
  engines: readonly string[]
): { family: string; label: string; models: string[] }[] {
  const byFamily = new Map<string, string[]>();
  for (const engine of engines) {
    const family = engineFamilyOf(engine);
    const models = byFamily.get(family);
    if (models) {
      models.push(engine);
    } else {
      byFamily.set(family, [engine]);
    }
  }
  return [...byFamily.entries()].map(([family, models]) => ({
    family,
    label: engineFamilyLabel(family),
    models,
  }));
}
