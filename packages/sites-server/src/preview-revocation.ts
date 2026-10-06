import { db } from "@notra/db/drizzle";
import { members, sites } from "@notra/db/schema";
import type { PreviewRevocationScope } from "@notra/sites-core/types/preview-token";
import { revokePreviewSessionsInState } from "@notra/sites-core/utils/preview-revocation";
import { eq, inArray } from "drizzle-orm";

import { mutateServingState, readServingState } from "./state";
import type { ServingSiteRef } from "./types/state";

async function revokeOnSite(
  site: ServingSiteRef,
  userId: string,
  scope: PreviewRevocationScope
): Promise<void> {
  if (!(await readServingState(site.id))) {
    return;
  }
  const nowMs = Date.now();
  await mutateServingState(site, (state) => ({
    write: {
      ...state,
      revokedSessions: revokePreviewSessionsInState(
        state.revokedSessions,
        userId,
        scope,
        nowMs
      ),
      updatedAt: new Date(nowMs).toISOString(),
    },
    result: undefined,
  }));
}

async function revokeOnSites(
  rows: ServingSiteRef[],
  userId: string,
  scope: PreviewRevocationScope
): Promise<void> {
  const results = await Promise.allSettled(
    rows.map((site) => revokeOnSite(site, userId, scope))
  );
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `Could not revoke preview sessions on ${failures.length} site(s)`
    );
  }
}

export async function revokeOrganizationMemberPreviewAccess(
  organizationId: string,
  userId: string
): Promise<void> {
  const rows = await db
    .select({ id: sites.id, slug: sites.slug })
    .from(sites)
    .where(eq(sites.organizationId, organizationId));
  await revokeOnSites(rows, userId, "access_lost");
}

export async function revokeUserPreviewSessions(userId: string): Promise<void> {
  const organizations = db
    .select({ organizationId: members.organizationId })
    .from(members)
    .where(eq(members.userId, userId));
  const rows = await db
    .select({ id: sites.id, slug: sites.slug })
    .from(sites)
    .where(inArray(sites.organizationId, organizations));
  await revokeOnSites(rows, userId, "signed_out");
}
