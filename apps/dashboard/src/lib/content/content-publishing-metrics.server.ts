import "server-only";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import type { ContentPublishingMetricsData } from "@/types/dashboard";

import { getUtcDateKeys, getUtcYearRange } from "./content-calendar";

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

  const dateMap = new Map<string, { drafts: number; published: number }>();
  let totalDrafts = 0;
  let totalPublished = 0;
  let maxCount = 1;

  for (const row of dailyCounts) {
    const drafts = Number(row.drafts);
    const published = Number(row.published);

    totalDrafts += Number(row.strictDrafts);
    totalPublished += published;
    maxCount = Math.max(maxCount, drafts + published);
    dateMap.set(row.day, { drafts, published });
  }

  const activity = getUtcDateKeys(yearStart, nextYearStart).map((dateKey) => {
    const entry = dateMap.get(dateKey) ?? { drafts: 0, published: 0 };
    const count = entry.drafts + entry.published;
    const percentage = count === 0 ? 0 : (count / maxCount) * 100;
    let level = 0;

    if (percentage > 75) {
      level = 4;
    } else if (percentage > 50) {
      level = 3;
    } else if (percentage > 25) {
      level = 2;
    } else if (percentage > 0) {
      level = 1;
    }

    return {
      date: dateKey,
      count,
      drafts: entry.drafts,
      published: entry.published,
      level,
    };
  });

  return {
    drafts: totalDrafts,
    published: totalPublished,
    graph: { activity },
  };
}
