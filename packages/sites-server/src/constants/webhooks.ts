export const SITES_WEBHOOK_EVENTS = new Set([
  "push",
  "pull_request",
  "check_run",
]);
export const PREVIEW_PR_ACTIONS = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

export const WEBHOOK_CLAIM_LEASE_SECONDS = 10 * 60;

export const BRANCH_REF_PREFIX = "refs/heads/";
export const ZERO_SHA = /^0+$/;
