import type {
  LogSourceFilter,
  LogStatusFilter,
} from "@/types/webhooks/webhooks";

export const LOGS_PAGE_SIZE = 10;
export const LOG_SEARCH_DEBOUNCE_MS = 150;
export const LOGS_OVERVIEW_STALE_TIME_MS = 30_000;

export const LOG_CONTEXT_FIELD_KEYS = [
  "triggerName",
  "outputType",
  "lookbackWindow",
  "repositoryCount",
  "companyName",
  "checks",
  "mentions",
  "prompts",
  "engines",
  "keywords",
  "suggestionsAdded",
  "url",
  "stage",
  "runId",
  "repository",
  "issueNumber",
  "senderLogin",
  "destinationMode",
  "commitSha",
  "commentUrl",
  "commentSnippet",
  "replySnippet",
  "postId",
  "pullRequestUrl",
  "mentionStatus",
  "durationMs",
] as const;

export const LOG_CONTEXT_FIELD_COMMON_LABEL_KEYS = {
  triggerName: "automation",
  outputType: "contentType",
  lookbackWindow: "lookbackWindow",
  companyName: "project",
  engines: "aiEngines",
  url: "url",
  repository: "repository",
  issueNumber: "issue",
  commitSha: "commit",
  postId: "post",
} as const satisfies Partial<
  Record<(typeof LOG_CONTEXT_FIELD_KEYS)[number], string>
>;

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
  "geo",
  "agent-readiness",
  "search-console",
  "brand",
] as const satisfies readonly LogSourceFilter[];

export const LOG_SOURCE_COMMON_LABEL_KEYS = {
  all: "allSources",
  github: "github",
  manual: "manual",
  schedule: "schedule",
  events: "events",
  geo: "geo",
  "agent-readiness": "agentReadiness",
  brand: "brand",
} as const satisfies Partial<Record<LogSourceFilter, string>>;

export const STATUS_VALUES = [
  "all",
  "success",
  "failed",
  "pending",
  "skipped",
] as const satisfies readonly LogStatusFilter[];
