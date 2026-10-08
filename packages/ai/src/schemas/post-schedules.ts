import {
  SCHEDULED_PUBLICATION_DESTINATIONS,
  SCHEDULED_PUBLICATION_STATUSES,
} from "@notra/db/constants/scheduled-publications";
import type { ScheduledPublicationDestinationConfig } from "@notra/db/types/scheduled-publications";
import { z } from "zod";

import { isValidTimezone } from "../utils/current-date";

/** An external destination of a schedule, as callers send it. */
export const scheduleDestinationSchema = z.discriminatedUnion("destination", [
  z.object({
    destination: z.literal("github"),
    repositoryId: z.string().trim().min(1).max(64),
    merge: z.boolean().default(true),
  }),
  z.object({
    destination: z.literal("social"),
    accountId: z.string().trim().min(1).max(64),
  }),
]);

/** Where one row of a schedule goes out; the stored destination config. */
export const scheduledPublicationConfigSchema = z.discriminatedUnion(
  "destination",
  [
    z.object({ destination: z.literal("notra") }),
    z.object({
      destination: z.literal("github"),
      repositoryId: z.string(),
      merge: z.boolean(),
    }),
    z.object({ destination: z.literal("social"), accountId: z.string() }),
  ]
) satisfies z.ZodType<ScheduledPublicationDestinationConfig>;

/**
 * The schedule contract every surface returns: the dashboard, the public API
 * and the chat tools.
 */
export const scheduledPublicationViewSchema = z.object({
  id: z.string(),
  destination: z.enum(SCHEDULED_PUBLICATION_DESTINATIONS),
  config: scheduledPublicationConfigSchema,
  status: z
    .enum(SCHEDULED_PUBLICATION_STATUSES)
    .describe(
      "scheduled → publishing → published or failed. Failed destinations are retried automatically for transient errors before they end up failed."
    ),
  scheduledAt: z.iso.datetime(),
  timeZone: z.string(),
  attempts: z.number().int(),
  errorCode: z.string().nullable(),
  lastError: z.string().nullable(),
  resultUrl: z
    .string()
    .nullable()
    .describe("Pull request or social post URL once published."),
  publishedAt: z.iso.datetime().nullable(),
});

export const postScheduleViewSchema = z.object({
  postId: z.string(),
  scheduledAt: z.iso.datetime(),
  timeZone: z.string(),
  publications: z.array(scheduledPublicationViewSchema),
});

export const calendarPostViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.string(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});

export const contentCalendarEntryViewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("scheduled"),
    post: calendarPostViewSchema,
    schedule: postScheduleViewSchema,
  }),
  z.object({ kind: z.literal("published"), post: calendarPostViewSchema }),
]);

export const schedulePostToolInputSchema = z.object({
  postId: z.string().trim().min(1).describe("ID of the post to publish."),
  scheduledAt: z.iso
    .datetime({ offset: true })
    .describe(
      "When to publish, as an ISO 8601 timestamp with offset, in the future and at most a year ahead. Convert from the user's timezone."
    ),
  timeZone: z
    .string()
    .trim()
    .refine(isValidTimezone, "Unknown time zone")
    .describe("IANA time zone of the user, for example Europe/Berlin."),
  githubRepositoryId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "GitHub integration ID to publish a blog post or changelog to. Omit to only publish in Notra."
    ),
  mergePullRequest: z
    .boolean()
    .optional()
    .describe(
      "Merge the pull request at the scheduled time. Defaults to true when githubRepositoryId is set."
    ),
  socialAccountId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Connected X or LinkedIn account ID to post a tweet or LinkedIn post from."
    ),
});

export const postScheduleToolInputSchema = z.object({
  postId: z.string().trim().min(1).describe("ID of the post."),
});
