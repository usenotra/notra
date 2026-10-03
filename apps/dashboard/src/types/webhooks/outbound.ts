import type { Badge } from "@notra/ui/components/ui/badge";
import type {
  Attempt,
  DeliveryActivityDay,
  DeliveryDetail,
  DeliverySummary,
  DeliveryStats,
  Endpoint,
} from "@notra/webhooks/schemas/webhooks";
import type { Schema } from "effect";
import type { ComponentProps } from "react";

import type { assertOrganizationAccess } from "@/lib/auth/organization";

export type WebhookAccessInput = Parameters<typeof assertOrganizationAccess>[0];
export type OutboundDelivery = Schema.Schema.Type<typeof DeliverySummary>;
type OutboundAttempt = Schema.Schema.Type<typeof Attempt>;
type OutboundEndpoint = Schema.Schema.Type<typeof Endpoint>;
type WebhookStats = Schema.Schema.Type<typeof DeliveryStats>;
export type WebhookFilter = "all" | OutboundDelivery["status"];
export type WebhookEventName = OutboundDelivery["eventType"];
export type WebhookTab = "deliveries" | "endpoints";
export type WebhookStatusVariant = NonNullable<
  ComponentProps<typeof Badge>["variant"]
>;

export type WebhookActivityDay = Schema.Schema.Type<typeof DeliveryActivityDay>;
type WebhookActivitySeries = Exclude<keyof WebhookActivityDay, "date">;

export interface WebhookMetric {
  readonly key: keyof WebhookStats;
  readonly hint: "period" | "share" | "now";
  /** 30-day trace; null for in-progress, which has no history. */
  readonly trace: {
    readonly series: WebhookActivitySeries;
    readonly className: string;
  } | null;
}

export interface WebhookWorkspaceProps {
  readonly organizationId: string;
}

export interface WebhookMetricsProps {
  readonly stats: WebhookStats | undefined;
  readonly activity: readonly WebhookActivityDay[] | undefined;
}

export interface WebhookSparklineProps {
  readonly days: readonly WebhookActivityDay[];
  readonly series: WebhookActivitySeries;
  readonly className: string;
}

export interface WebhookEndpointsProps {
  readonly endpoints: readonly OutboundEndpoint[];
  readonly disabled: boolean;
  readonly onRemove: (endpointId: string) => void;
  readonly onCreate: () => void;
}

export interface WebhookDeliveriesProps {
  readonly rows: OutboundDelivery[];
  readonly filter: WebhookFilter;
  readonly offset: number;
  readonly loading: boolean;
  readonly fetching: boolean;
  readonly hasMore: boolean;
  readonly onSelect: (delivery: OutboundDelivery) => void;
  readonly onPage: (offset: number) => void;
}

export interface WebhookStatusFilterProps {
  readonly filter: WebhookFilter;
  readonly onFilter: (filter: WebhookFilter) => void;
}

export interface WebhookWorkspaceViewProps {
  readonly stats: WebhookStats | undefined;
  readonly activity: readonly WebhookActivityDay[] | undefined;
  readonly endpoints: readonly OutboundEndpoint[];
  readonly rows: OutboundDelivery[];
  readonly canManage: boolean;
  readonly loading: boolean;
  readonly fetching: boolean;
  readonly error: string | null;
  readonly filter: WebhookFilter;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly removing: boolean;
  readonly onFilter: (filter: WebhookFilter) => void;
  readonly onPage: (offset: number) => void;
  readonly onRefresh: () => void;
  readonly onSelect: (delivery: OutboundDelivery) => void;
  readonly onCreate: () => void;
  readonly onRemove: (endpointId: string) => void;
  readonly defaultTab?: WebhookTab;
}

export interface WebhookCreateProps {
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: () => void;
}

export interface WebhookCreateDialogViewProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly secret: string | null;
  readonly pending: boolean;
  readonly onSubmit: (url: string, events: WebhookEventName[]) => void;
}

export interface WebhookDetailsProps {
  readonly organizationId: string;
  readonly delivery: OutboundDelivery | null;
  readonly onClose: () => void;
  readonly onRetry: (deliveryId: string) => void;
  readonly retrying: boolean;
  readonly canRetry: boolean;
}

export interface WebhookDeliveryDetail {
  readonly delivery: Schema.Schema.Type<typeof DeliveryDetail>;
  readonly attempts: readonly OutboundAttempt[];
}

export interface WebhookDetailsSheetViewProps extends Omit<
  WebhookDetailsProps,
  "organizationId"
> {
  readonly detail: WebhookDeliveryDetail | undefined;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onReload: () => void;
}

export interface WebhookDeliverySummaryProps {
  readonly entry: OutboundDelivery;
}

export interface WebhookAttemptListProps {
  readonly attempts: readonly OutboundAttempt[];
}

export interface WebhookPayloadProps {
  readonly payload: string;
}
