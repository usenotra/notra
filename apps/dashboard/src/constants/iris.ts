import { IRIS_CAPABILITY_CATALOG } from "@notra/ai/constants/autonomy-capabilities";
import {
  SIGNAL_KIND_GITHUB_PULL_REQUEST_MERGED,
  SIGNAL_KIND_GITHUB_PUSH,
  SIGNAL_KIND_GITHUB_RELEASE_PUBLISHED,
} from "@notra/ai/constants/autonomy-signals";
import type { MandatePolicy } from "@notra/ai/schemas/autonomy/mandate";

export const IRIS_DEFAULT_MAX_ACTIONS_PER_DAY = 10;
export const IRIS_DEFAULT_MAX_COST_CENTS_PER_DAY = 500;
export const IRIS_DEFAULT_MAX_TASKS_PER_PLAN = 6;
export const IRIS_DEFAULT_DESTINATIONS = ["slack"];

export const IRIS_DEFAULT_POLICY: MandatePolicy = {
  allowedCapabilities: IRIS_CAPABILITY_CATALOG.map(
    (capability) => capability.name
  ),
  allowedDestinations: IRIS_DEFAULT_DESTINATIONS,
  maxActionsPerDay: IRIS_DEFAULT_MAX_ACTIONS_PER_DAY,
  maxCostCentsPerDay: IRIS_DEFAULT_MAX_COST_CENTS_PER_DAY,
  maxTasksPerPlan: IRIS_DEFAULT_MAX_TASKS_PER_PLAN,
  autoPublish: false,
};

export const IRIS_MANDATE_INITIAL_VERSION = 1;

export const IRIS_FLAG_KEY = "iris";
export const IRIS_NAV_LINK = "/iris";
export const IRIS_FLAG_CACHE_TTL_MS = 60_000;
export const IRIS_FLAG_STALE_TIME_MS = 30_000;
export const IRIS_FLAG_ERROR_REASON = "ERROR";
export const IRIS_UNAVAILABLE_TITLE = "Iris is not available yet";
export const IRIS_UNAVAILABLE_DESCRIPTION =
  "Iris is not available for this workspace yet.";

export const IRIS_WAKE_ROUTE_PATH = "/api/workflows/iris";

export const IRIS_SIGNAL_COMMIT_SUBJECT_LIMIT = 3;
export const IRIS_SIGNAL_COMMIT_SUBJECT_MAX_LENGTH = 80;

export const IRIS_RECENT_ACTION_LIMIT = 20;
export const IRIS_RUNS_PAGE_SIZE = 20;
export const IRIS_STATS_WINDOW_DAYS = 30;
export const IRIS_STATS_WINDOW_MS =
  IRIS_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const IRIS_OPEN_RUN_STATUSES = ["planning", "executing"] as const;

export const IRIS_SIGNAL_KIND_RELEASE_PUBLISHED =
  SIGNAL_KIND_GITHUB_RELEASE_PUBLISHED;
export const IRIS_SIGNAL_KIND_PUSH = SIGNAL_KIND_GITHUB_PUSH;
export const IRIS_SIGNAL_KIND_PULL_REQUEST_MERGED =
  SIGNAL_KIND_GITHUB_PULL_REQUEST_MERGED;

export const IRIS_ACTIVE_POLL_INTERVAL_MS = 10_000;
export const IRIS_IDLE_POLL_INTERVAL_MS = 60_000;
export const IRIS_SIGNALS_PREVIEW_LIMIT = 12;

export const IRIS_CAPABILITY_LABELS: Record<string, string> = {
  "source.github.read": "Repository read",
  "analytics.social.read": "Read social analytics",
  "analytics.experiment.create": "Start A/B test",
  "analytics.experiment.read": "Read A/B tests",
  "content.changelog.create": "Changelog",
  "content.blog-post.create": "Blog post",
  "content.social-post.create": "Social post",
};

export const IRIS_SIGNAL_KIND_LABELS: Record<string, string> = {
  [IRIS_SIGNAL_KIND_RELEASE_PUBLISHED]: "Release published",
  [IRIS_SIGNAL_KIND_PUSH]: "Code pushed",
  [IRIS_SIGNAL_KIND_PULL_REQUEST_MERGED]: "Pull request merged",
};

export const IRIS_TRIGGER_LABELS: Record<string, string> = {
  signal: "New activity",
  wake: "Scheduled check",
  manual: "Run now",
  repair: "Retry",
};

export const IRIS_RUN_STATUS_LABELS: Record<string, string> = {
  planning: "Thinking",
  executing: "Working",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

export const IRIS_TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  ready: "Queued",
  running: "Running",
  waiting: "Waiting",
  completed: "Done",
  failed: "Failed",
  canceled: "Canceled",
};

export const IRIS_SIGNAL_STATUS_LABELS: Record<string, string> = {
  pending: "Waiting",
  coalesced: "Grouped",
  processed: "Reviewed",
  discarded: "Skipped",
};

export const IRIS_SLACK_TERMINAL_ERRORS = [
  "channel_not_configured",
  "channel_not_found",
  "not_in_channel",
  "token_revoked",
  "is_archived",
  "missing_scope",
  "invalid_auth",
  "not_authed",
  "account_inactive",
];

export const IRIS_START_CLAIM_SCOPE = "iris-start";
export const IRIS_START_CLAIM_TTL_SECONDS = 2100;
