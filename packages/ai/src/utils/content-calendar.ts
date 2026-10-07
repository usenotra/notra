import { db } from "@notra/db/drizzle";
import { posts, scheduledPublications } from "@notra/db/schema";
import { projectScopedCollectionIds } from "@notra/db/utils/projects";
import { and, asc, eq, gte, inArray, lt, ne } from "drizzle-orm";

import type {
  CalendarPostView,
  ContentCalendarEntryView,
  ContentCalendarView,
} from "../types/scheduled-publications";
import {
  groupPostSchedules,
  scheduledPublicationViewColumns,
} from "./scheduled-publications";

const calendarPostColumns = {
  id: posts.id,
  title: posts.title,
  contentType: posts.contentType,
  status: posts.status,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
};

interface CalendarPostRow {
  id: string;
  title: string;
  contentType: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
}

function toCalendarPostView(row: CalendarPostRow): CalendarPostView {
  return {
    id: row.id,
    title: row.title,
    contentType: row.contentType,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Everything the calendar shows for `[from, to)`: scheduled slots (with the
 * state of every destination) and posts published in the range.
 *
 * A post published by one of its schedules appears once, as the schedule;
 * its `published_at` would otherwise put a second chip on the same day.
 */
export async function listContentCalendar(params: {
  organizationId: string;
  projectId?: string | null;
  from: Date;
  to: Date;
}): Promise<ContentCalendarView> {
  const collectionScope = projectScopedCollectionIds(
    params.organizationId,
    params.projectId
  );
  const postScope = collectionScope
    ? inArray(posts.collectionId, collectionScope)
    : undefined;

  const [scheduleRows, publishedRows] = await Promise.all([
    db
      .select({
        ...scheduledPublicationViewColumns,
        post: calendarPostColumns,
      })
      .from(scheduledPublications)
      .innerJoin(posts, eq(posts.id, scheduledPublications.postId))
      .where(
        and(
          eq(scheduledPublications.organizationId, params.organizationId),
          ne(scheduledPublications.status, "canceled"),
          gte(scheduledPublications.scheduledAt, params.from),
          lt(scheduledPublications.scheduledAt, params.to),
          postScope
        )
      )
      .orderBy(
        asc(scheduledPublications.scheduledAt),
        asc(scheduledPublications.createdAt)
      ),
    db
      .select(calendarPostColumns)
      .from(posts)
      .where(
        and(
          eq(posts.organizationId, params.organizationId),
          eq(posts.status, "published"),
          gte(posts.publishedAt, params.from),
          lt(posts.publishedAt, params.to),
          postScope
        )
      )
      .orderBy(asc(posts.publishedAt)),
  ]);

  const postsById = new Map<string, CalendarPostRow>();
  for (const row of scheduleRows) {
    postsById.set(row.postId, row.post);
  }
  const schedules = groupPostSchedules(scheduleRows);
  const entries: ContentCalendarEntryView[] = [];
  const publishedBySchedule = new Set<string>();
  for (const schedule of schedules) {
    const post = postsById.get(schedule.postId);
    if (!post) {
      continue;
    }
    if (
      schedule.publications.some(
        (publication) =>
          publication.destination === "notra" &&
          publication.status === "published"
      )
    ) {
      publishedBySchedule.add(schedule.postId);
    }
    entries.push({
      kind: "scheduled",
      post: toCalendarPostView(post),
      schedule,
    });
  }
  for (const post of publishedRows) {
    if (publishedBySchedule.has(post.id)) {
      continue;
    }
    entries.push({ kind: "published", post: toCalendarPostView(post) });
  }

  return { entries };
}
