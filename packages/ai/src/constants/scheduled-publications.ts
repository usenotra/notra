import type { SchedulePostFailureReason } from "../types/scheduled-publications";

const MINUTE_MS = 60 * 1000;

/**
 * How long a claimed row belongs to one workflow run. A run refreshes it when
 * it starts publishing; a run that died leaves it to expire, and the next
 * sweep after that takes the row over.
 */
export const SCHEDULED_PUBLICATION_LEASE_MS = 15 * MINUTE_MS;

/** Delay before a sweep retries a row whose workflow could not be started. */
export const SCHEDULED_PUBLICATION_START_RETRY_MS = MINUTE_MS;

/**
 * How long after its slot a row may keep failing to start before it is
 * marked failed. Covers a platform outage, not a permanently broken deploy.
 */
export const SCHEDULED_PUBLICATION_START_BUDGET_MS = 6 * 60 * MINUTE_MS;

/**
 * Claims per sweep. Each due time also wakes its post through QStash, so the
 * cron sweep is the safety net for lost wakes and expired leases.
 */
export const SCHEDULED_PUBLICATION_SWEEP_LIMIT = 50;

/**
 * Attempts per row, counting stale-lease takeovers. The delays apply after the
 * attempt with the same index failed with a retryable error.
 */
export const SCHEDULED_PUBLICATION_MAX_ATTEMPTS = 5;
export const SCHEDULED_PUBLICATION_RETRY_DELAYS_MS = [
  MINUTE_MS,
  5 * MINUTE_MS,
  15 * MINUTE_MS,
  60 * MINUTE_MS,
] as const;

/** Dashboard route QStash calls when a post's schedule is due. */
export const SCHEDULED_PUBLICATION_WAKE_ROUTE_PATH =
  "/api/workflows/scheduled-publication-wake";

/** Farthest ahead a post can be scheduled. */
export const SCHEDULED_PUBLICATION_MAX_LEAD_MS = 366 * 24 * 60 * MINUTE_MS;

/**
 * A slot this far in the past is still accepted, so a dialog that sat open
 * for a moment on "now" does not fail validation.
 */
export const SCHEDULED_PUBLICATION_PAST_GRACE_MS = 5 * MINUTE_MS;

export const SCHEDULED_PUBLICATION_ERROR_CODES = {
  POST_NOT_FOUND: "post_not_found",
  SUBSCRIPTION_REQUIRED: "subscription_required",
  OUTCOME_UNKNOWN: "outcome_unknown",
  TOO_MANY_ATTEMPTS: "too_many_attempts",
  START_FAILED: "start_failed",
  CANCELED: "canceled",
  EMPTY_CONTENT: "empty_content",
  GITHUB_PUBLISH_FAILED: "github_publish_failed",
  GITHUB_MERGE_FAILED: "github_merge_failed",
  SOCIAL_PUBLISH_FAILED: "social_publish_failed",
  UNEXPECTED: "unexpected",
} as const;

/**
 * How a rejected schedule reaches API clients and the chat model. The
 * dashboard maps the same reasons to translated copy, keyed by `status`.
 */
export const SCHEDULE_POST_FAILURES = {
  post_not_found: { status: 404, message: "Post not found" },
  invalid_time: {
    status: 400,
    message: "scheduledAt must be between now and one year ahead",
  },
  destination_not_supported: {
    status: 400,
    message: "This content type cannot be published to that destination",
  },
  repository_not_found: {
    status: 400,
    message: "GitHub repository not found or not enabled",
  },
  account_not_found: {
    status: 400,
    message: "Social account not found for this content type's platform",
  },
  publishing_in_progress: {
    status: 409,
    message: "The post is being published right now; retry in a minute",
  },
  unconfirmed_social_post: {
    status: 409,
    message:
      "A social post of the current schedule may already be live. Check the account, then cancel the schedule before scheduling again",
  },
  social_already_posted: {
    status: 409,
    message:
      "This post already went out to that account; create a new post to post again",
  },
  conflict: {
    status: 409,
    message: "The schedule changed concurrently; retry the request",
  },
} as const satisfies Record<
  SchedulePostFailureReason,
  { status: 400 | 404 | 409; message: string }
>;
