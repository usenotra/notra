import { Clock, Effect } from "effect";

import { LEASE_SECONDS } from "../constants/delivery";
import { IdentifierRow, StoredDelivery } from "../schemas/webhooks";
import { WebhookCrypto } from "../services/crypto";
import { queryRows } from "../services/database";
import { WebhookTransport } from "../services/transport";
import type {
  DeliveryId,
  DeliveryOutcome,
  StoredDelivery as ClaimedDelivery,
} from "../types/webhooks";
import { retryDelaySeconds, shouldRetry } from "../utils/retry";
import { signatureMessage } from "../utils/signature";

export const claimDelivery = Effect.fn("webhooks.claimDelivery")(function* (
  id: DeliveryId
) {
  const token = yield* Effect.sync(() => crypto.randomUUID());
  const rows = yield* queryRows(
    StoredDelivery,
    `WITH claimed AS (
    UPDATE webhook_deliveries d SET status = 'sending', attempt_count = attempt_count + 1,
      lease_token = $2, lease_expires_at = now() + ($3 * interval '1 second'), updated_at = now()
    WHERE d.id = $1 AND d.status IN ('pending', 'retrying') AND d.next_attempt_at <= now() AND d.attempt_count < d.attempt_limit
      AND EXISTS (SELECT 1 FROM webhook_endpoints e WHERE e.id = d.endpoint_id AND e.organization_id = d.organization_id AND e.enabled AND e.deleted_at IS NULL)
    RETURNING d.*
  ), attempt AS (
    INSERT INTO webhook_attempts (id, delivery_id, attempt_number)
    SELECT lease_token, id, attempt_count FROM claimed RETURNING id
  ) SELECT c.id, c.event_id AS "eventId", c.endpoint_id AS "endpointId", c.organization_id AS "organizationId",
    c.url, c.secret, c.attempt_count AS "attemptCount", c.attempt_limit AS "attemptLimit", c.lease_token AS "leaseToken", e.payload, e.event_type AS "eventType"
    FROM claimed c JOIN webhook_events e ON e.id = c.event_id JOIN attempt a ON a.id = c.lease_token`,
    [id, token, LEASE_SECONDS]
  );
  return rows[0];
});

export const finishDelivery = Effect.fn("webhooks.finishDelivery")(function* (
  delivery: ClaimedDelivery,
  outcome: DeliveryOutcome
) {
  const succeeded =
    outcome.statusCode !== null &&
    outcome.statusCode >= 200 &&
    outcome.statusCode < 300;
  const failureStatus = shouldRetry(
    outcome,
    delivery.attemptCount,
    delivery.attemptLimit
  )
    ? "retrying"
    : "failed";
  const status = succeeded ? "succeeded" : failureStatus;
  const delay = retryDelaySeconds(
    delivery.attemptCount,
    outcome.retryAfterSeconds
  );
  const result = yield* queryRows(
    IdentifierRow,
    `WITH finished AS (
    UPDATE webhook_deliveries SET status = $3, lease_token = NULL, lease_expires_at = NULL,
      next_attempt_at = now() + ($4 * interval '1 second'), updated_at = now()
    WHERE id = $1 AND lease_token = $2 AND status = 'sending' RETURNING id
  ), attempt AS (
    UPDATE webhook_attempts SET finished_at = now(), status_code = $5, error = $6, duration_ms = $7
    WHERE id = $2 AND delivery_id IN (SELECT id FROM finished)
  ) SELECT id FROM finished`,
    [
      delivery.id,
      delivery.leaseToken,
      status,
      delay,
      outcome.statusCode,
      outcome.error,
      outcome.durationMs,
    ]
  );
  yield* Effect.logInfo("Webhook delivery attempt finished").pipe(
    Effect.annotateLogs({
      deliveryId: delivery.id,
      eventId: delivery.eventId,
      attempt: delivery.attemptCount,
      status,
      statusCode: outcome.statusCode,
      applied: result.length === 1,
    })
  );
});

export const deliver = Effect.fn("webhooks.deliver")(function* (
  deliveryId: DeliveryId
) {
  const delivery = yield* claimDelivery(deliveryId);
  if (!delivery) {
    return;
  }
  const cryptography = yield* WebhookCrypto;
  const transport = yield* WebhookTransport;
  const outcome = yield* Effect.gen(function* () {
    const secret = yield* cryptography.decrypt(
      delivery.secret,
      delivery.endpointId
    );
    const now = yield* Clock.currentTimeMillis;
    const timestamp = String(Math.floor(now / 1000));
    const signature = yield* cryptography.sign(
      secret,
      signatureMessage(
        delivery.eventId,
        delivery.id,
        timestamp,
        delivery.payload
      )
    );
    return yield* transport.send({
      url: delivery.url,
      payload: delivery.payload,
      headers: {
        "content-type": "application/json",
        "user-agent": "Notra-Webhooks/1.0",
        "x-notra-event": delivery.eventType,
        "x-notra-event-id": delivery.eventId,
        "x-notra-delivery-id": delivery.id,
        "x-notra-timestamp": timestamp,
        "x-notra-signature": `v1,${signature}`,
      },
    });
  }).pipe(
    Effect.catchTag("WebhookCryptoError", () =>
      Effect.succeed({
        statusCode: null,
        retryAfterSeconds: null,
        durationMs: 0,
        error: "signing_failed",
      })
    )
  );
  yield* finishDelivery(delivery, outcome);
});
