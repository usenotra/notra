import { db } from "@notra/db/drizzle";
import { demoSandboxes } from "@notra/db/schema";
import { isDifferentLocalDay } from "@notra/utils/demo-clock";
import { and, eq, sql } from "drizzle-orm";

import { DEMO_REBASE_EXCLUDED_TABLES } from "@/constants/demo";
import type {
  DemoSandbox,
  DemoTimestampColumnRow,
  DemoTimestampColumns,
} from "@/types/demo";

let timestampColumnsPromise: Promise<DemoTimestampColumns[]> | null = null;

/**
 * Every timestamp column of every organization-scoped table, read from the
 * catalog instead of a hand-kept list so new columns are rebased
 * automatically.
 */
function loadTimestampColumns(): Promise<DemoTimestampColumns[]> {
  timestampColumnsPromise ??= db
    .execute(
      sql`
        SELECT c.table_name, array_agg(c.column_name::text ORDER BY c.column_name) AS columns
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.data_type IN ('timestamp without time zone', 'timestamp with time zone')
          AND EXISTS (
            SELECT 1 FROM information_schema.columns o
            WHERE o.table_schema = 'public'
              AND o.table_name = c.table_name
              AND o.column_name = 'organization_id'
          )
        GROUP BY c.table_name
      `
    )
    .then((result) =>
      (result.rows as DemoTimestampColumnRow[])
        .filter((row) => !DEMO_REBASE_EXCLUDED_TABLES.has(row.table_name))
        .map((row) => ({ table: row.table_name, columns: row.columns }))
    )
    .catch((error: unknown) => {
      timestampColumnsPromise = null;
      throw error;
    });
  return timestampColumnsPromise;
}

export function shouldRebaseDemoSandbox(
  sandbox: DemoSandbox,
  now: Date
): boolean {
  return isDifferentLocalDay(sandbox.anchorAt, now, sandbox.timeZone);
}

/**
 * Shifts every timestamp in the sandbox forward by the time since it was last
 * anchored, so "last scan 2 h ago" stays true on day two. The anchor is moved
 * with a compare-and-set inside the transaction: of two concurrent requests
 * only one shifts, the other sees the new anchor and does nothing.
 */
export async function rebaseDemoSandbox(
  sandbox: DemoSandbox,
  now: Date
): Promise<DemoSandbox> {
  const deltaMs = now.getTime() - sandbox.anchorAt.getTime();
  if (deltaMs <= 0) {
    return sandbox;
  }
  const tables = await loadTimestampColumns();
  const interval = `${Math.round(deltaMs / 1000)} seconds`;

  const moved = await db.transaction(async (tx) => {
    const claimed = await tx
      .update(demoSandboxes)
      .set({ anchorAt: now })
      .where(
        and(
          eq(demoSandboxes.anonymousId, sandbox.anonymousId),
          eq(demoSandboxes.anchorAt, sandbox.anchorAt)
        )
      )
      .returning({ anonymousId: demoSandboxes.anonymousId });
    if (claimed.length === 0) {
      return false;
    }

    for (const { table, columns } of tables) {
      const assignments = sql.join(
        columns.map(
          (column) =>
            sql`${sql.identifier(column)} = ${sql.identifier(column)} + ${interval}::interval`
        ),
        sql`, `
      );
      await tx.execute(
        sql`UPDATE ${sql.identifier(table)} SET ${assignments} WHERE organization_id = ${sandbox.organizationId}`
      );
    }
    return true;
  });

  return moved ? { ...sandbox, anchorAt: now } : sandbox;
}
