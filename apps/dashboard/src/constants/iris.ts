import { IRIS_CAPABILITY_CATALOG } from "@notra/ai/constants/autonomy-capabilities";
import {
  SIGNAL_KIND_GITHUB_PULL_REQUEST_MERGED,
  SIGNAL_KIND_GITHUB_PUSH,
  SIGNAL_KIND_GITHUB_RELEASE_PUBLISHED,
} from "@notra/ai/constants/autonomy-signals";
import type { MandatePolicy } from "@notra/ai/schemas/autonomy/mandate";

import type { CommonLabelKey } from "@/types/i18n";
import type { IrisMessageKey } from "@/types/iris";

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

export const IRIS_CAPABILITY_LABEL_KEYS: Record<string, IrisMessageKey> = {
  "source.github.read": "capabilities.repositoryRead",
  "analytics.social.read": "capabilities.readSocialAnalytics",
  "analytics.experiment.create": "capabilities.startAbTest",
  "analytics.experiment.read": "capabilities.readAbTests",
  "content.social-post.create": "capabilities.socialPost",
};

export const IRIS_CAPABILITY_COMMON_LABEL_KEYS: Record<string, CommonLabelKey> =
  {
    "content.changelog.create": "changelog",
    "content.blog-post.create": "blogPost",
  };

export const IRIS_SIGNAL_KIND_LABEL_KEYS: Record<string, IrisMessageKey> = {
  [IRIS_SIGNAL_KIND_PUSH]: "signalKinds.codePushed",
  [IRIS_SIGNAL_KIND_PULL_REQUEST_MERGED]: "signalKinds.pullRequestMerged",
};

export const IRIS_SIGNAL_KIND_COMMON_LABEL_KEYS: Record<
  string,
  CommonLabelKey
> = {
  [IRIS_SIGNAL_KIND_RELEASE_PUBLISHED]: "releasePublished",
};

export const IRIS_TRIGGER_LABEL_KEYS: Record<string, IrisMessageKey> = {
  signal: "triggers.signal",
  wake: "triggers.wake",
  repair: "triggers.repair",
};

export const IRIS_TRIGGER_COMMON_LABEL_KEYS: Record<string, CommonLabelKey> = {
  manual: "runNow",
};

export const IRIS_RUN_STATUS_LABEL_KEYS: Record<string, IrisMessageKey> = {
  executing: "runStatus.executing",
  completed: "runStatus.completed",
};

export const IRIS_RUN_STATUS_COMMON_LABEL_KEYS: Record<string, CommonLabelKey> =
  {
    planning: "thinkingLabel",
    failed: "failed",
    canceled: "canceled",
  };

export const IRIS_TASK_STATUS_LABEL_KEYS: Record<string, IrisMessageKey> = {
  running: "taskStatus.running",
  waiting: "shared.waiting",
  completed: "taskStatus.completed",
};

export const IRIS_TASK_STATUS_COMMON_LABEL_KEYS: Record<
  string,
  CommonLabelKey
> = {
  pending: "queued",
  ready: "queued",
  failed: "failed",
  canceled: "canceled",
};

export const IRIS_SIGNAL_STATUS_LABEL_KEYS: Record<string, IrisMessageKey> = {
  pending: "shared.waiting",
  coalesced: "signalStatus.coalesced",
  processed: "signalStatus.processed",
};

export const IRIS_SIGNAL_STATUS_COMMON_LABEL_KEYS: Record<
  string,
  CommonLabelKey
> = {
  discarded: "skipped",
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
