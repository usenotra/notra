export const SCHEDULED_PUBLICATION_STATUSES = [
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
] as const;

export const SCHEDULED_PUBLICATION_DESTINATIONS = [
  "notra",
  "github",
  "social",
] as const;

/** Rows the sweep may still pick up; at most one per post and destination. */
export const ACTIVE_SCHEDULED_PUBLICATION_STATUSES = [
  "scheduled",
  "publishing",
] as const;
