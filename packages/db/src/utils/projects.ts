import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { db, type createDb } from "../drizzle";
import { postCollections, projects } from "../schema";

type ProjectDatabase = Pick<ReturnType<typeof createDb>, "query">;

/**
 * Restricts a query to one project. Rows without a project (created by
 * organization-level automations, the public API, or external channels)
 * belong to every project, so they always pass the filter.
 */
export function projectScopeFilter(
  column: PgColumn,
  projectId: string | null | undefined
): SQL | undefined {
  if (!projectId) {
    return;
  }
  return or(eq(column, projectId), isNull(column));
}

/**
 * Subquery of collection ids visible from a project. Posts carry no project
 * of their own; they inherit it from their collection. Returns undefined when
 * no project is active so callers can skip the filter entirely.
 */
export function projectScopedCollectionIds(
  organizationId: string,
  projectId: string | null | undefined
) {
  const scope = projectScopeFilter(postCollections.projectId, projectId);
  if (!scope) {
    return;
  }
  return db
    .select({ id: postCollections.id })
    .from(postCollections)
    .where(and(eq(postCollections.organizationId, organizationId), scope));
}

export async function isProjectInOrganization(
  organizationId: string,
  projectId: string,
  database: ProjectDatabase = db
): Promise<boolean> {
  const row = await database.query.projects.findFirst({
    columns: { id: true },
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId)
    ),
  });
  return Boolean(row);
}
