import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { getLastVisitedProject } from "@/utils/cookies";

/**
 * The project the GEO pages will show once the client has hydrated. The
 * sidebar resolves the same value (URL param, then the last-visited cookie,
 * then the oldest project) and writes it into the URL after `projectsList`
 * lands. Resolving it on the server lets the query keys of the server prefetch
 * and the first client render agree, so the hydrated cache is used instead of
 * being refetched, and the GEO subtree does not remount on the URL rewrite.
 *
 * Cached per request: the GEO layout and every GEO page call this with the same
 * arguments.
 */
export const resolveInitialGeoProjectId = cache(
  async (
    organizationId: string,
    organizationSlug: string,
    requestedProjectId: string | undefined
  ): Promise<string | undefined> => {
    if (requestedProjectId) {
      return requestedProjectId;
    }

    const cookieStore = await cookies();
    const lastVisitedProjectId = getLastVisitedProject(
      cookieStore,
      organizationSlug
    );

    if (lastVisitedProjectId) {
      const lastVisited = await db.query.projects.findFirst({
        columns: { id: true },
        where: and(
          eq(projects.id, lastVisitedProjectId),
          eq(projects.organizationId, organizationId)
        ),
      });
      if (lastVisited) {
        return lastVisited.id;
      }
    }

    const oldest = await db.query.projects.findFirst({
      columns: { id: true },
      where: eq(projects.organizationId, organizationId),
      orderBy: [asc(projects.createdAt)],
    });
    return oldest?.id;
  }
);
