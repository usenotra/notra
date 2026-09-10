import type { GitHubEventType } from "@notra/schemas/dashboard/github-webhook";
import type { InputIntegrationType } from "@notra/schemas/dashboard/integrations";
import type { NextRequest } from "next/server";

export interface WebhookContext {
  provider: InputIntegrationType;
  organizationId: string;
  integrationId: string;
  repositoryId: string;
  request: NextRequest;
  rawBody: string;
}

export type WebhookHandler = (
  context: WebhookContext
) => Response | Promise<Response>;

export type WebhookLogStatus = "success" | "failed" | "pending" | "skipped";

export type StatusWithCode =
  | { label: "pending"; code: number | null }
  | { label: "success"; code: number | null }
  | { label: "failed"; code: number | null }
  | { label: "skipped"; code: number | null };

export type LogDirection = "incoming" | "outgoing";

export type IntegrationType =
  | "github"
  | "linear"
  | "slack"
  | "webhook"
  | "manual"
  | "schedule"
  | "events";

export type LogSourceFilter = "all" | Exclude<IntegrationType, "slack">;

export type LogStatusFilter = "all" | WebhookLogStatus;

export interface Log {
  id: string;
  integrationId?: string;
  hasPayload?: boolean;
  referenceId: string | null;
  title: string;
  integrationType: IntegrationType;
  direction: LogDirection;
  status: WebhookLogStatus;
  statusCode: number | null;
  errorMessage: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LogsResponse {
  logs: Log[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface GithubProcessedEvent {
  type: string;
  action: string;
  data: Record<string, unknown>;
}

export interface MatchingEventTrigger {
  id: string;
  sourceConfig: unknown;
}

export interface DispatchEventTriggerProps {
  trigger: MatchingEventTrigger;
  processedEvent: GithubProcessedEvent;
  repositoryId: string;
  deliveryId?: string;
}

export interface DispatchEventTriggersProps {
  triggers: MatchingEventTrigger[];
  processedEvent: GithubProcessedEvent;
  repositoryId: string;
  deliveryId?: string;
}

export type GithubMemoryEventType = Exclude<GitHubEventType, "ping">;

export interface GithubCreateMemoryEntryProps {
  organizationId: string;
  eventType: GithubMemoryEventType;
  repository: string;
  action: string;
  data: Record<string, unknown>;
  customId: string;
}

export interface WebhookLogInput {
  organizationId: string;
  integrationId: string;
  integrationType: IntegrationType;
  title: string;
  status: WebhookLogStatus;
  statusCode: number | null;
  referenceId?: string | null;
  errorMessage?: string | null;
  payload?: Record<string, unknown> | null;
  retentionDays?: LogRetentionDays;
}

export type LogRetentionDays = 7 | 14 | 30;

export interface LinearWebhookPayload {
  action: string;
  type: string;
  data?: Record<string, unknown>;
}
