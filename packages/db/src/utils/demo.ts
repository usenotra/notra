import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  DEMO_ORG_SLUG_PREFIX,
  DEMO_SEEDING_GRACE_MINUTES,
} from "../constants/demo";
// biome-ignore lint/performance/noNamespaceImport: drizzle needs the full schema type
import type * as schema from "../schema";

/**
 * Whether the database holds organizations that are not demo sandboxes. The
 * public demo refuses to run if so: a dedicated demo database only ever holds
 * sandboxes. Organizations younger than the grace window may be sandboxes
 * still being seeded (their sandbox row is written last); older demo-slug
 * organizations without a row are orphans that cleanup removes.
 */
export async function hasNonDemoOrganizations(
  database: NodePgDatabase<typeof schema>
): Promise<boolean> {
  const result = await database.execute(
    sql`SELECT 1 FROM organizations o
        WHERE o.created_at < now() - make_interval(mins => ${DEMO_SEEDING_GRACE_MINUTES})
          AND o.slug NOT LIKE ${`${DEMO_ORG_SLUG_PREFIX}%`}
          AND NOT EXISTS (
            SELECT 1 FROM demo_sandboxes s WHERE s.organization_id = o.id
          )
        LIMIT 1`
  );
  return result.rows.length > 0;
}
