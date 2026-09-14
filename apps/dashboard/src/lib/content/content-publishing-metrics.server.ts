import "server-only";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import type { ContentPublishingMetricsData } from "@/types/dashboard";
import { buildContentPublishingMetrics } from "@/utils/content-publishing-metrics";

import { getUtcYearRange } from "./content-calendar";

export async function getContentPublishingMetrics(
  organizationId: string
): Promise<ContentPublishingMetricsData> {
  const { startDate: yearStart, endDate: nextYearStart } = getUtcYearRange();

  const dailyCounts = await db
    .select({
      day: sql<string>`to_char(${posts.createdAt}, 'YYYY-MM-DD')`,
      drafts: sql<number>`count(*) filter (where ${posts.status} <> 'published')::int`,
      strictDrafts: sql<number>`count(*) filter (where ${posts.status} = 'draft')::int`,
      published: sql<number>`count(*) filter (where ${posts.status} = 'published')::int`,
    })
    .from(posts)
    .where(
      and(
        eq(posts.organizationId, organizationId),
        gte(posts.createdAt, yearStart),
        lt(posts.createdAt, nextYearStart)
      )
    )
    .groupBy(sql`to_char(${posts.createdAt}, 'YYYY-MM-DD')`);

  return buildContentPublishingMetrics(dailyCounts, yearStart, nextYearStart);
}
