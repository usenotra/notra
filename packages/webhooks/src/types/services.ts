import type { Effect } from "effect";

import type {
  WebhookStorageError,
  WebhookCryptoError,
  WebhookQueueError,
} from "../errors/webhooks";
import type { DeliveryOutcome, SendRequest } from "./webhooks";

export interface WebhookDatabaseService {
  readonly query: (
    sql: string,
    parameters: readonly unknown[]
  ) => Effect.Effect<unknown, WebhookStorageError>;
}

export interface WebhookCryptoService {
  readonly createSecret: () => Effect.Effect<string>;
  readonly encrypt: (
    secret: string,
    endpointId: string
  ) => Effect.Effect<string, WebhookCryptoError>;
  readonly decrypt: (
    encrypted: string,
    endpointId: string
  ) => Effect.Effect<string, WebhookCryptoError>;
  readonly sign: (
    secret: string,
    message: string
  ) => Effect.Effect<string, WebhookCryptoError>;
  readonly verify: (
    secret: string,
    message: string,
    signature: string
  ) => Effect.Effect<boolean, WebhookCryptoError>;
}

export interface WebhookQueuesService {
  readonly event: (eventId: string) => Effect.Effect<void, WebhookQueueError>;
  readonly delivery: (
    deliveryId: string
  ) => Effect.Effect<void, WebhookQueueError>;
}

export interface WebhookTransportService {
  readonly send: (request: SendRequest) => Effect.Effect<DeliveryOutcome>;
}
