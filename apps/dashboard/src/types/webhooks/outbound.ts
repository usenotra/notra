import type { Badge } from "@notra/ui/components/ui/badge";
import type {
  Attempt,
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

export interface WebhookMetric {
  readonly key: keyof WebhookStats;
  readonly label: string;
  readonly tone: string;
}

export interface WebhookWorkspaceProps {
  readonly organizationId: string;
}

export interface WebhookMetricsProps {
  readonly stats: WebhookStats | undefined;
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
  readonly onFilter: (filter: WebhookFilter) => void;
  readonly onPage: (offset: number) => void;
}

export interface WebhookCreateProps {
  readonly organizationId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: () => void;
}

export interface WebhookDetailsProps {
  readonly organizationId: string;
  readonly delivery: OutboundDelivery | null;
  readonly onClose: () => void;
  readonly onRetry: (deliveryId: string) => void;
  readonly retrying: boolean;
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
