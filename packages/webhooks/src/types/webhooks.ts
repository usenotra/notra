import type { Schema } from "effect";

import type * as schemas from "../schemas/webhooks";

export type OrganizationId = Schema.Schema.Type<typeof schemas.OrganizationId>;
export type EndpointId = Schema.Schema.Type<typeof schemas.EndpointId>;
export type EventId = Schema.Schema.Type<typeof schemas.EventId>;
export type DeliveryId = Schema.Schema.Type<typeof schemas.DeliveryId>;
export type PublishInput = Schema.Schema.Type<typeof schemas.PublishInput>;
export type EndpointInput = Schema.Schema.Type<typeof schemas.EndpointInput>;
export type StoredDelivery = Schema.Schema.Type<typeof schemas.StoredDelivery>;
export interface DeliveryOutcome {
  readonly statusCode: number | null;
  readonly error: string | null;
  readonly durationMs: number;
  readonly retryAfterSeconds: number | null;
}
export interface SendRequest {
  readonly url: string;
  readonly payload: string;
  readonly headers: Readonly<Record<string, string>>;
}
