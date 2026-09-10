import type {
  LogSourceFilter,
  LogStatusFilter,
} from "@/types/webhooks/webhooks";

export const LOGS_PAGE_SIZE = 10;
export const LOG_SEARCH_DEBOUNCE_MS = 150;
export const LOGS_OVERVIEW_STALE_TIME_MS = 30_000;

export const LOG_STATUS_DESCRIPTIONS = {
  success: "This event completed successfully.",
  failed:
    "This event could not complete. Review the error below before retrying the automation.",
  pending:
    "This event was recorded as pending. Refresh the logs to check for a later result.",
  skipped:
    "No content was generated for this event. Review the reason below and the source activity for this run.",
};

export const LOG_CONTEXT_FIELDS = {
  triggerName: "Automation",
  outputType: "Content type",
  lookbackWindow: "Lookback window",
  repositoryCount: "Repositories checked",
  runId: "Run ID",
} as const;

export const LOG_CONTEXT_ALIASES: Record<string, string> = {
  runId: "workflowRunId",
  triggerName: "scheduleName",
};

export const SOURCE_VALUES = [
  "all",
  "github",
  "linear",
  "webhook",
  "manual",
  "schedule",
  "events",
] as const satisfies readonly LogSourceFilter[];

export const STATUS_VALUES = [
  "all",
  "success",
  "failed",
  "pending",
  "skipped",
] as const satisfies readonly LogStatusFilter[];

export const SOURCE_LABELS: Record<LogSourceFilter, string> = {
  all: "All sources",
  github: "GitHub",
  linear: "Linear",
  webhook: "Webhook",
  manual: "Manual",
  schedule: "Schedule",
  events: "Events",
};

export const STATUS_LABELS: Record<LogStatusFilter, string> = {
  all: "All statuses",
  success: "Success",
  failed: "Failed",
  pending: "Pending",
  skipped: "Skipped",
};
