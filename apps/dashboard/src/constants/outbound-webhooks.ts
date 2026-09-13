import { PAGE_SIZE } from "@notra/webhooks/constants/delivery";

import type {
  OutboundDelivery,
  WebhookEventName,
  WebhookFilter,
  WebhookMetric,
  WebhookStatusVariant,
} from "@/types/webhooks/outbound";

export const WEBHOOK_PAGE_SIZE = PAGE_SIZE;
export const WEBHOOK_REFRESH_INTERVAL_MS = 10_000;
export const WEBHOOK_TABLE_ROW_HEIGHT = 60;
export const WEBHOOK_TABLE_HEADER_HEIGHT = 42;
export const WEBHOOK_TABLE_MAX_HEIGHT = 440;
export const WEBHOOK_TABLE_EMPTY_HEIGHT = 230;

export const WEBHOOK_FILTERS = [
  "all",
  "succeeded",
  "failed",
  "retrying",
  "pending",
  "sending",
  "cancelled",
] as const satisfies readonly WebhookFilter[];

export const WEBHOOK_FILTER_LABELS: Record<WebhookFilter, string> = {
  all: "All statuses",
  succeeded: "Delivered",
  failed: "Failed",
  retrying: "Retrying",
  pending: "Pending",
  sending: "Sending",
  cancelled: "Cancelled",
};

export const WEBHOOK_EVENTS = [
  "post.generation.completed",
  "post.generation.failed",
  "post.generation.skipped",
] as const satisfies readonly WebhookEventName[];

export const WEBHOOK_STATUS_VARIANTS: Record<
  OutboundDelivery["status"],
  WebhookStatusVariant
> = {
  succeeded: "success",
  failed: "destructive",
  retrying: "warning",
  sending: "info",
  pending: "outline",
  cancelled: "secondary",
};

export const WEBHOOK_METRICS: readonly WebhookMetric[] = [
  { key: "total", label: "Deliveries", tone: "" },
  { key: "succeeded", label: "Delivered", tone: "text-success" },
  { key: "active", label: "In progress", tone: "text-warning" },
  { key: "failed", label: "Failed", tone: "text-destructive" },
];
