import type {
  ScheduledPublicationDestination,
  ScheduledPublicationDestinationConfig,
  ScheduledPublicationResult,
  ScheduledPublicationStatus,
} from "@notra/db/types/scheduled-publications";
import type { z } from "zod";

import type {
  calendarPostViewSchema,
  contentCalendarEntryViewSchema,
  postScheduleToolInputSchema,
  postScheduleViewSchema,
  scheduleDestinationSchema,
  schedulePostToolInputSchema,
  scheduledPublicationViewSchema,
} from "../schemas/post-schedules";

export type ScheduleDestination = z.output<typeof scheduleDestinationSchema>;
export type ScheduledPublicationView = z.infer<
  typeof scheduledPublicationViewSchema
>;
export type PostScheduleView = z.infer<typeof postScheduleViewSchema>;
export type CalendarPostView = z.infer<typeof calendarPostViewSchema>;
export type ContentCalendarEntryView = z.infer<
  typeof contentCalendarEntryViewSchema
>;
export interface ContentCalendarView {
  entries: ContentCalendarEntryView[];
}

export type SchedulePostToolInput = z.infer<typeof schedulePostToolInputSchema>;
export type PostScheduleToolInput = z.infer<typeof postScheduleToolInputSchema>;

export interface SchedulePostParams {
  organizationId: string;
  postId: string;
  scheduledAt: Date;
  timeZone: string;
  destinations: ScheduleDestination[];
  userId: string | null;
  /**
   * IDs of the pending rows the caller is replacing (empty for a post with no
   * schedule). When set, the call fails with `conflict` if the post's pending
   * or failed rows changed since the caller loaded them. Without it, failed
   * rows are superseded, except a social post that may already be live.
   */
  expectedScheduledIds?: string[];
  now?: Date;
}

export type SchedulePostFailureReason =
  | "post_not_found"
  | "invalid_time"
  | "destination_not_supported"
  | "repository_not_found"
  | "account_not_found"
  | "publishing_in_progress"
  | "unconfirmed_social_post"
  | "social_already_posted"
  | "conflict";

export interface SchedulePostRejection {
  ok: false;
  reason: SchedulePostFailureReason;
}

/** How replacing a post's pending rows went, before the view is read back. */
export type ScheduleReplaceOutcome = { ok: true } | SchedulePostRejection;

export type SchedulePostOutcome =
  | { ok: true; schedule: PostScheduleView }
  | SchedulePostRejection;

export interface ScheduledPublicationRowForView {
  id: string;
  postId: string;
  destination: ScheduledPublicationDestination;
  destinationConfig: ScheduledPublicationDestinationConfig;
  status: ScheduledPublicationStatus;
  scheduledAt: Date;
  timeZone: string;
  attempts: number;
  errorCode: string | null;
  lastError: string | null;
  result: ScheduledPublicationResult | null;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface ClaimedScheduledPublication {
  id: string;
  organizationId: string;
  postId: string;
  destination: ScheduledPublicationDestination;
  claimToken: string;
}

export interface ScheduledPublicationAttempt {
  id: string;
  organizationId: string;
  postId: string;
  destination: ScheduledPublicationDestination;
  destinationConfig: ScheduledPublicationDestinationConfig;
  scheduledAt: Date;
  attempts: number;
  createdByUserId: string | null;
  createdAt: Date;
  /** What earlier attempts achieved, like a pull request already opened. */
  result: ScheduledPublicationResult | null;
}

export type ScheduledPublicationOutcome =
  | { kind: "published"; result: ScheduledPublicationResult }
  | {
      kind: "error";
      code: string;
      message: string;
      /** Worth another attempt after a back-off (transient upstream failure). */
      retryable: boolean;
      /** Anything the attempt achieved before failing, like an opened PR. */
      result?: ScheduledPublicationResult;
    };

export interface BegunScheduledPublicationAttempt {
  attempt: ScheduledPublicationAttempt;
  /**
   * The outcome when the attempt is decided before any destination is
   * touched (an unconfirmed social send, a cancel, a crash loop); `null`
   * means publish.
   */
  preempted: ScheduledPublicationOutcome | null;
}

export type ScheduledPublicationFinish =
  | "published"
  | "retry_scheduled"
  | "failed"
  | "canceled"
  | "superseded";
