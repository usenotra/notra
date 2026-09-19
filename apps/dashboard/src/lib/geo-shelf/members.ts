import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { desc, eq } from "drizzle-orm";

import { retryTransientDbError } from "@/lib/db/retry";
import { getORPCRequestMemo } from "@/lib/orpc/context";
import { badRequest } from "@/lib/orpc/utils/errors";

import type {
  GeoShelfMember,
  GeoShelfOpportunity,
  GeoShelfOpportunityPatch,
  GeoShelfSource,
} from "../../types/geo-shelf";

async function queryGeoShelfMembers(
  organizationId: string
): Promise<GeoShelfMember[]> {
  const rows = await retryTransientDbError(() =>
    db.query.members.findMany({
      where: eq(members.organizationId, organizationId),
      orderBy: [desc(members.createdAt)],
      with: {
        users: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    })
  );

  return rows.flatMap((row) => {
    if (!row.users) {
      return [];
    }
    return [
      {
        id: row.id,
        userId: row.users.id,
        name: row.users.name,
        email: row.users.email,
        image: row.users.image,
        role: row.role,
      },
    ];
  });
}

/** Share one read between the shelf list and member picker in an RPC batch. */
export function listGeoShelfMembers(organizationId: string, headers: Headers) {
  const memo = getORPCRequestMemo(headers)?.shelfMembersByOrganization;
  const pending = memo?.get(organizationId);
  if (pending) {
    return pending;
  }
  const query = queryGeoShelfMembers(organizationId);
  memo?.set(organizationId, query);
  return query;
}

export function findCurrentGeoShelfMemberId(
  shelfMembers: GeoShelfMember[],
  userId: string
): string | null {
  return shelfMembers.find((member) => member.userId === userId)?.id ?? null;
}

/** True when the payload names anyone, i.e. when member ids have to be resolved. */
export function referencesGeoShelfMembers(
  opportunity: GeoShelfOpportunityPatch | null | undefined
): boolean {
  if (!opportunity) {
    return false;
  }
  return (
    (opportunity.assigneeMemberId !== undefined &&
      opportunity.assigneeMemberId !== null) ||
    (opportunity.pocMemberId !== undefined && opportunity.pocMemberId !== null)
  );
}

/**
 * Only ids that are actually being set to a new value are validated, so a
 * ticket whose assignee already left the organization stays editable.
 */
export function assertGeoShelfOpportunityMembers(
  shelfMembers: GeoShelfMember[],
  opportunity: GeoShelfOpportunityPatch | null | undefined,
  existing: GeoShelfOpportunity | null
): void {
  if (!opportunity) {
    return;
  }
  const memberIds = new Set(shelfMembers.map((member) => member.id));
  const changed = [
    {
      next: opportunity.assigneeMemberId,
      previous: existing?.assigneeMemberId,
    },
    { next: opportunity.pocMemberId, previous: existing?.pocMemberId },
  ];
  for (const { next, previous } of changed) {
    if (next === undefined || next === null || next === previous) {
      continue;
    }
    if (!memberIds.has(next)) {
      throw badRequest("That person is not a member of this organization");
    }
  }
}

export function collectGeoShelfMemberIds(
  sources: GeoShelfSource[]
): Set<string> {
  const ids = new Set<string>();
  for (const source of sources) {
    const opportunity = source.opportunity;
    if (!opportunity) {
      continue;
    }
    if (opportunity.assigneeMemberId) {
      ids.add(opportunity.assigneeMemberId);
    }
    if (opportunity.pocMemberId) {
      ids.add(opportunity.pocMemberId);
    }
  }
  return ids;
}

/** Members can leave the organization: drop their ids from what we hand out. */
export function sanitizeGeoShelfSourceMembers(
  sources: GeoShelfSource[],
  shelfMembers: GeoShelfMember[]
): GeoShelfSource[] {
  const memberIds = new Set(shelfMembers.map((member) => member.id));
  return sources.map((source) => {
    const opportunity = source.opportunity;
    if (!opportunity) {
      return source;
    }
    const assigneeMemberId =
      opportunity.assigneeMemberId &&
      memberIds.has(opportunity.assigneeMemberId)
        ? opportunity.assigneeMemberId
        : null;
    const pocMemberId =
      opportunity.pocMemberId && memberIds.has(opportunity.pocMemberId)
        ? opportunity.pocMemberId
        : null;
    if (
      assigneeMemberId === opportunity.assigneeMemberId &&
      pocMemberId === opportunity.pocMemberId
    ) {
      return source;
    }
    return {
      ...source,
      opportunity: { ...opportunity, assigneeMemberId, pocMemberId },
    };
  });
}
