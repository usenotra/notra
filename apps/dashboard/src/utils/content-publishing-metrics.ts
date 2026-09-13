import type {
  ContentActivityEntry,
  ContentPublishingDailyCount,
  ContentPublishingMetricsData,
} from "@/types/dashboard";

function getActivityLevel(count: number, maxCount: number): number {
  const percentage = count === 0 ? 0 : (count / maxCount) * 100;

  if (percentage > 75) {
    return 4;
  }
  if (percentage > 50) {
    return 3;
  }
  if (percentage > 25) {
    return 2;
  }
  return percentage > 0 ? 1 : 0;
}

function getUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildContentPublishingMetrics(
  dailyCounts: ContentPublishingDailyCount[],
  yearStart: Date,
  nextYearStart: Date
): ContentPublishingMetricsData {
  let totalDrafts = 0;
  let totalPublished = 0;
  let maxCount = 1;

  for (const row of dailyCounts) {
    totalDrafts += Number(row.strictDrafts);
    totalPublished += Number(row.published);
    maxCount = Math.max(maxCount, Number(row.drafts) + Number(row.published));
  }

  const yearEnd = new Date(nextYearStart);
  yearEnd.setUTCDate(yearEnd.getUTCDate() - 1);

  const activityByDate = new Map<string, ContentActivityEntry>();
  for (const date of [getUtcDateKey(yearStart), getUtcDateKey(yearEnd)]) {
    activityByDate.set(date, {
      date,
      count: 0,
      drafts: 0,
      published: 0,
      level: 0,
    });
  }

  for (const row of dailyCounts) {
    const drafts = Number(row.drafts);
    const published = Number(row.published);
    const count = drafts + published;

    activityByDate.set(row.day, {
      date: row.day,
      count,
      drafts,
      published,
      level: getActivityLevel(count, maxCount),
    });
  }

  return {
    drafts: totalDrafts,
    published: totalPublished,
    graph: {
      activity: [...activityByDate.values()].sort((left, right) =>
        left.date.localeCompare(right.date)
      ),
    },
  };
}
