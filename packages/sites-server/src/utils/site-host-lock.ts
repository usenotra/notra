import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { eq, sql } from "drizzle-orm";

import { SiteInputError } from "../errors";
import type { SiteStorageTransaction } from "../types/deployments";
import type { SiteHostLockOptions } from "../types/site-host-lock";

export async function acquireSiteHostLock(
  tx: SiteStorageTransaction,
  hostname: string
): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`sites-host:${hostname}`}, 0))`
  );
}

export async function withSiteHostLock<T>(
  hostname: string,
  run: (tx: SiteStorageTransaction) => Promise<T>,
  options: SiteHostLockOptions = {}
): Promise<T> {
  const locked = async (tx: SiteStorageTransaction) => {
    if (options.organizationId !== undefined) {
      const [organization] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, options.organizationId))
        .for("key share");
      if (!organization) {
        throw new SiteInputError("Workspace not found");
      }
    }
    await acquireSiteHostLock(tx, hostname);
    return await run(tx);
  };
  return options.tx ? await locked(options.tx) : await db.transaction(locked);
}
