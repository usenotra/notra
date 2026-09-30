export const GITHUB_MENTION_BILLING_LOCK_PREFIX = "github-mention-billing";

/**
 * A mention can read files, run the repo sandbox and commit, so the hold
 * outlives the longest run. Autumn frees it on its own if the run never
 * finalizes, for example because the function was killed mid-flight.
 */
export const GITHUB_MENTION_BILLING_LOCK_TTL_MS = 30 * 60 * 1000;

/**
 * Smallest balance a run needs to start, and what it is charged when the run
 * ended without reporting usage. Credits are cents, the same unit as
 * `ai_credits`, so a mention costs what its model calls cost.
 */
export const GITHUB_MENTION_MINIMUM_CREDITS = 1;

/** Tags the Autumn usage event so mention spend is separable from chat spend. */
export const GITHUB_MENTION_BILLING_SOURCE = "github_mention";

export const GITHUB_MENTION_CREDITS_EXHAUSTED_MESSAGE =
  "This month's pull request credits for this organization are used up, so I stopped before doing any work. Top up AI credits or move to a bigger plan in Notra, then mention me again.";

export const GITHUB_MENTION_NO_ENTITLEMENT_MESSAGE =
  "This organization has no pull request credits left to spend on me. Add AI credits or pick a plan in Notra, then mention me again.";
