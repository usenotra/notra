import { setTimeout as delay } from "node:timers/promises";

import type { db } from "@notra/db/drizzle";
import { sql } from "drizzle-orm";

export async function waitForPgBlocker(
  executor: Pick<typeof db, "execute">,
  blockerPid: number
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await executor.execute(
      sql`select pid from pg_stat_activity where datname = current_database() and ${blockerPid} = any(pg_blocking_pids(pid))`
    );
    const pid = Number(result.rows[0]?.pid);
    if (pid) {
      return pid;
    }
    await delay(10);
  }
  throw new Error(`No PostgreSQL waiter for backend ${blockerPid}`);
}
