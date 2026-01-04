export type WebhookLogStatus = "success" | "failed" | "pending";

export type LogDirection = "incoming" | "outgoing";

export type IntegrationType = "github" | "linear" | "slack" | "webhook";

export interface Log {
  id: string;
  referenceId: string | null;
  title: string;
  integrationType: IntegrationType;
  direction: LogDirection;
  status: WebhookLogStatus;
  statusCode: number | null;
  errorMessage: string | null;
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
