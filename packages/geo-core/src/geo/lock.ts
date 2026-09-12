import { sql } from "drizzle-orm";
import type { Effect } from "effect";

import type { DbTransaction } from "../types/db";
import { geoDb } from "./effect";
import type { GeoDatabaseError } from "./errors";

export function lockGeoProject(
  tx: DbTransaction,
  projectId: string
): Effect.Effect<void, GeoDatabaseError> {
  return geoDb("project lock failed", () =>
    lockGeoProjectInTransaction(tx, projectId)
  );
}

export async function lockGeoProjectInTransaction(
  tx: DbTransaction,
  projectId: string
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`geo-project:${projectId}`}, 0))`
  );
}

/**
 * Serializes transactions that reason about an organization's *set* of
 * projects — deleting the last one, in particular, where a plain count is a
 * read of state another transaction is about to change.
 *
 * Always take this before `lockGeoProject` when both are needed, so no two
 * transactions can acquire them in opposite orders and deadlock.
 */
export function lockGeoOrganization(
  tx: DbTransaction,
  organizationId: string
): Effect.Effect<void, GeoDatabaseError> {
  return geoDb("organization lock failed", async () => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`geo-organization:${organizationId}`}, 0))`
    );
  });
}
