export type WebhookLogStatus = "success" | "failed" | "pending";

export interface WebhookLog {
  id: string;
  eventType: string;
  source: string;
  status: WebhookLogStatus;
  statusCode: number | null;
  requestUrl: string;
  requestMethod: string;
  responseTime: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface WebhookLogsResponse {
  logs: WebhookLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
