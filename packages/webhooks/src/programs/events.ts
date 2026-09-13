import { Clock, Effect, Schema } from "effect";

import { API_VERSION, MAX_PAYLOAD_BYTES } from "../constants/delivery";
import {
  WebhookStorageError,
  WebhookValidationError,
} from "../errors/webhooks";
import { EventId, IdentifierRow, PublishInput } from "../schemas/webhooks";
import { queryRows } from "../services/database";

export const publishEvent = Effect.fn("webhooks.publishEvent")(function* (
  input: unknown
) {
  const body = yield* Schema.decodeUnknownEffect(PublishInput)(input).pipe(
    Effect.mapError(
      () => new WebhookValidationError({ message: "Invalid webhook event" })
    )
  );
  const now = yield* Clock.currentTimeMillis;
  const id = yield* Effect.sync(() => `whev_${crypto.randomUUID()}`);
  const payload = JSON.stringify({
    id,
    type: body.event.type,
    apiVersion: API_VERSION,
    createdAt: new Date(now).toISOString(),
    organizationId: body.organizationId,
    data: body.event.data,
  });
  if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
    return yield* new WebhookValidationError({
      message: "Webhook payload exceeds 64 KiB",
    });
  }
  const [event] = yield* queryRows(
    IdentifierRow,
    `WITH inserted AS (
    INSERT INTO webhook_events (id, organization_id, source_key, event_type, payload)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (organization_id, source_key) DO NOTHING RETURNING *
  ), deliveries AS (
    INSERT INTO webhook_deliveries (id, organization_id, event_id, endpoint_id, url, secret)
    SELECT inserted.id || '_' || endpoint.id, inserted.organization_id, inserted.id, endpoint.id, endpoint.url, endpoint.secret
    FROM inserted JOIN webhook_endpoints endpoint ON endpoint.organization_id = inserted.organization_id
    WHERE endpoint.enabled AND endpoint.deleted_at IS NULL AND inserted.event_type = ANY(endpoint.events)
    ON CONFLICT (event_id, endpoint_id) DO NOTHING
  ) SELECT id FROM inserted`,
    [id, body.organizationId, body.sourceKey, body.event.type, payload]
  );
  const existing =
    event ??
    (yield* queryRows(
      IdentifierRow,
      "SELECT id FROM webhook_events WHERE organization_id = $1 AND source_key = $2",
      [body.organizationId, body.sourceKey]
    ))[0];
  if (!existing) {
    return yield* new WebhookStorageError({
      operation: "publishEvent",
      cause: "Event insert returned no row",
    });
  }
  return yield* Schema.decodeUnknownEffect(EventId)(existing.id);
});
