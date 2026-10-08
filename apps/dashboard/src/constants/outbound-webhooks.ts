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
export const WEBHOOK_TABLE_ROW_HEIGHT = 40;
export const WEBHOOK_TABLE_EMPTY_HEIGHT = 330;
export const WEBHOOK_SPARKLINE_EMPTY_PX = 2;
export const WEBHOOK_SPARKLINE_MIN_PERCENT = 12;

export const WEBHOOK_FILTERS = [
  "all",
  "succeeded",
  "failed",
  "retrying",
  "pending",
  "sending",
  "cancelled",
] as const satisfies readonly WebhookFilter[];

export const WEBHOOK_EVENTS = [
  "post.generation.completed",
  "post.generation.failed",
  "post.generation.skipped",
  "brand_identity.generation.completed",
  "brand_identity.generation.failed",
  "post.published",
  "post.created",
  "post.updated",
  "post.deleted",
  "post.unpublished",
  "geo.scan.completed",
  "geo.scan.failed",
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
  {
    key: "total",
    hint: "period",
    trace: { series: "total", className: "bg-foreground/35" },
  },
  {
    key: "succeeded",
    hint: "share",
    trace: { series: "succeeded", className: "bg-success/70" },
  },
  {
    key: "failed",
    hint: "share",
    trace: { series: "failed", className: "bg-destructive/80" },
  },
  { key: "active", hint: "now", trace: null },
];
