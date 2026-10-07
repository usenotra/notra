import { logError } from "@notra/ai/utils/server-log";
import {
  isTinybirdConfigured,
  queryPostMetricsLookup,
} from "@notra/analytics/tinybird/client";
import { db } from "@notra/db/drizzle";
import { socialExperiments } from "@notra/db/schema";
import { desc, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";

import { ANALYTICS_QUERY_FAILED_MESSAGE } from "../constants/analytics";
import { getAbTestsInputSchema } from "../schemas/analytics-tools";
import { requireOrganizationId } from "../utils/organization";

interface VariantMetrics {
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
}

function metricValue(
  metric: string,
  stats: VariantMetrics | undefined
): number | null {
  if (!stats) {
    return null;
  }
  if (metric === "impressions") {
    return stats.impressions;
  }
  if (metric === "likes") {
    return stats.likes;
  }
  return (stats.likes ?? 0) + (stats.replies ?? 0) + (stats.reposts ?? 0);
}

export function createGetAbTestsTool() {
  return defineTool({
    description:
      "List the organization's social A/B tests with live results: each test compares two published posts on one metric (engagement, impressions, or likes). Returns name, status, metric, both variants' current values, and the winner when completed. Use to learn which content styles win before writing new posts.",
    inputSchema: getAbTestsInputSchema,
    async execute(_input, ctx) {
      const organizationId = requireOrganizationId(ctx);

      try {
        const rows = await db.query.socialExperiments.findMany({
          where: eq(socialExperiments.organizationId, organizationId),
          orderBy: [desc(socialExperiments.createdAt)],
        });

        if (rows.length === 0) {
          return "No A/B tests exist yet. Create one with create_ab_test using two post ids from get_top_posts.";
        }

        const postIds = [
          ...new Set(
            rows.flatMap((row) => [row.variantAPostId, row.variantBPostId])
          ),
        ];
        const lookup = isTinybirdConfigured()
          ? await queryPostMetricsLookup({
              organization_id: organizationId,
              post_ids: postIds,
            })
          : null;
        const statsByPost = new Map(
          (lookup?.data ?? []).map((row) => [
            row.platform_post_id,
            {
              impressions:
                row.impressions === null ? null : Number(row.impressions),
              likes: row.likes === null ? null : Number(row.likes),
              replies: row.replies === null ? null : Number(row.replies),
              reposts: row.reposts === null ? null : Number(row.reposts),
            },
          ])
        );

        return {
          experiments: rows.map((row) => ({
            id: row.id,
            name: row.name,
            hypothesis: row.hypothesis,
            status: row.status,
            metric: row.metric,
            winner: row.winner,
            started_at: row.startedAt.toISOString(),
            variant_a: {
              post_id: row.variantAPostId,
              value: metricValue(
                row.metric,
                statsByPost.get(row.variantAPostId)
              ),
            },
            variant_b: {
              post_id: row.variantBPostId,
              value: metricValue(
                row.metric,
                statsByPost.get(row.variantBPostId)
              ),
            },
          })),
        };
      } catch (error) {
        logError("Get A/B tests tool failed", error, { organizationId });
        return ANALYTICS_QUERY_FAILED_MESSAGE;
      }
    },
  });
}
