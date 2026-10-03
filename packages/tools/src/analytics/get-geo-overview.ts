import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import {
  queryGeoCheckCompetitorShare,
  queryGeoCheckOverview,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { and, asc, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";

import { ANALYTICS_QUERY_FAILED_MESSAGE } from "../constants/analytics";
import { getGeoOverviewInputSchema } from "../schemas/analytics-tools";
import { requireOrganizationId } from "../utils/organization";

const COMPETITOR_LIMIT = 10;

export function createGetGeoOverviewTool() {
  return defineTool({
    description:
      "Get one GEO project's AI visibility status. Supply projectId for a specific project; otherwise uses the organization's oldest project. Returns the project ID and name alongside per-engine mention rates and competitor brands. Never combines different projects.",
    inputSchema: getGeoOverviewInputSchema,
    async execute({ days, projectId }, ctx) {
      const organizationId = requireOrganizationId(ctx);

      try {
        const project = await db.query.projects.findFirst({
          columns: { id: true, name: true },
          where: projectId
            ? and(
                eq(projects.id, projectId),
                eq(projects.organizationId, organizationId)
              )
            : eq(projects.organizationId, organizationId),
          orderBy: [asc(projects.createdAt), asc(projects.id)],
        });
        if (!project) {
          return "GEO project not found in this organization.";
        }
        const scope = { organizationId, projectId: project.id };
        const window = toGeoCheckWindow({ days });
        const [overview, competitors] = await Promise.all([
          queryGeoCheckOverview(scope, window),
          queryGeoCheckCompetitorShare(scope, window, COMPETITOR_LIMIT),
        ]);

        return {
          project: { id: project.id, name: project.name },
          engines: overview.map((row) => ({
            engine: row.engine,
            checks: row.checks,
            mentions: row.mentions,
            mention_rate: row.mentionRate,
            avg_position: row.avgPosition,
          })),
          competitor_share: competitors.map((row) => ({
            brand: row.brand,
            mentions: row.mentions,
          })),
        };
      } catch (error) {
        console.error("[Tools] GEO overview failed:", error);
        return ANALYTICS_QUERY_FAILED_MESSAGE;
      }
    },
  });
}
