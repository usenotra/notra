import { db } from "@notra/db/drizzle";
import { sql } from "drizzle-orm";

import type { SiteStorageTransaction } from "../types/deployments";

export async function withSiteHostLock<T>(
  hostname: string,
  run: (tx: SiteStorageTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`sites-host:${hostname}`}, 0))`
    );
    return await run(tx);
  });
}
