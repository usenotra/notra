import { Effect } from "effect";

import { MAX_ATTEMPTS, PAGE_SIZE } from "../constants/delivery";
import { WebhookNotFound, WebhookValidationError } from "../errors/webhooks";
import {
  Attempt,
  DeliveryDetail,
  DeliveryStats,
  DeliverySummary,
  IdentifierRow,
} from "../schemas/webhooks";
import { queryRows } from "../services/database";
import type { DeliveryId, OrganizationId } from "../types/webhooks";
import { isoTimestamp } from "../utils/sql";

export const listDeliveries = Effect.fn("webhooks.listDeliveries")(function* (
  organizationId: OrganizationId,
  offset = 0,
  status = "all"
) {
  return yield* queryRows(
    DeliverySummary,
    `SELECT d.id, d.event_id AS "eventId", d.endpoint_id AS "endpointId", d.status, d.url,
    e.event_type AS "eventType", a.status_code AS "statusCode", a.error,
    d.attempt_count AS "attemptCount", ${isoTimestamp("d.next_attempt_at")} AS "nextAttemptAt", ${isoTimestamp("d.created_at")} AS "createdAt"
    FROM webhook_deliveries d JOIN webhook_events e ON e.id = d.event_id
    LEFT JOIN webhook_attempts a ON a.delivery_id = d.id AND a.attempt_number = d.attempt_count
    WHERE d.organization_id = $1 AND ($3 = 'all' OR d.status = $3)
    ORDER BY d.created_at DESC, d.id DESC LIMIT $4 OFFSET $2`,
    [organizationId, Math.max(0, Math.floor(offset)), status, PAGE_SIZE + 1]
  );
});

export const deliveryStats = Effect.fn("webhooks.deliveryStats")(function* (
  organizationId: OrganizationId
) {
  const [stats] = yield* queryRows(
    DeliveryStats,
    `SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status = 'succeeded')::int AS succeeded,
    count(*) FILTER (WHERE status = 'failed')::int AS failed,
    count(*) FILTER (WHERE status IN ('pending', 'sending', 'retrying'))::int AS active
    FROM webhook_deliveries WHERE organization_id = $1 AND created_at >= now() - interval '30 days'`,
    [organizationId]
  );
  return stats ?? { total: 0, succeeded: 0, failed: 0, active: 0 };
});

export const getDelivery = Effect.fn("webhooks.getDelivery")(function* (
  organizationId: OrganizationId,
  deliveryId: DeliveryId
) {
  const [delivery] = yield* queryRows(
    DeliveryDetail,
    `SELECT d.id, d.event_id AS "eventId", d.endpoint_id AS "endpointId", d.status, d.url,
    e.event_type AS "eventType", e.payload, a.status_code AS "statusCode", a.error,
    d.attempt_count AS "attemptCount", ${isoTimestamp("d.next_attempt_at")} AS "nextAttemptAt", ${isoTimestamp("d.created_at")} AS "createdAt"
    FROM webhook_deliveries d JOIN webhook_events e ON e.id = d.event_id
    LEFT JOIN webhook_attempts a ON a.delivery_id = d.id AND a.attempt_number = d.attempt_count
    WHERE d.organization_id = $1 AND d.id = $2`,
    [organizationId, deliveryId]
  );
  return delivery ?? (yield* new WebhookNotFound({ resource: "delivery" }));
});

export const listAttempts = Effect.fn("webhooks.listAttempts")(function* (
  organizationId: OrganizationId,
  deliveryId: DeliveryId
) {
  const [delivery] = yield* queryRows(
    IdentifierRow,
    "SELECT id FROM webhook_deliveries WHERE id = $1 AND organization_id = $2",
    [deliveryId, organizationId]
  );
  if (!delivery) {
    return yield* new WebhookNotFound({ resource: "delivery" });
  }
  return yield* queryRows(
    Attempt,
    `SELECT a.id, a.delivery_id AS "deliveryId", a.attempt_number AS "attemptNumber",
    ${isoTimestamp("a.started_at")} AS "startedAt", ${isoTimestamp("a.finished_at")} AS "finishedAt", a.status_code AS "statusCode", a.error, a.duration_ms AS "durationMs"
    FROM webhook_attempts a JOIN webhook_deliveries d ON d.id = a.delivery_id WHERE a.delivery_id = $1 AND d.organization_id = $2 ORDER BY a.attempt_number`,
    [deliveryId, organizationId]
  );
});

export const retryDelivery = Effect.fn("webhooks.retryDelivery")(function* (
  organizationId: OrganizationId,
  deliveryId: DeliveryId
) {
  const [retry] = yield* queryRows(
    IdentifierRow,
    `UPDATE webhook_deliveries d
    SET status = 'retrying', next_attempt_at = now(), attempt_limit = attempt_count + $3, updated_at = now()
    WHERE d.organization_id = $1 AND d.id = $2 AND d.status = 'failed' AND d.updated_at < now() - interval '1 minute'
    AND EXISTS (SELECT 1 FROM webhook_endpoints e WHERE e.id = d.endpoint_id AND e.enabled AND e.deleted_at IS NULL)
    RETURNING id`,
    [organizationId, deliveryId, MAX_ATTEMPTS]
  );
  if (!retry) {
    return yield* new WebhookValidationError({
      message:
        "Only failed deliveries to active endpoints can be retried. Wait one minute after the last attempt.",
    });
  }
  return retry;
});
