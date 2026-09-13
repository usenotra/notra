import { Effect, Schema } from "effect";

import { WebhookNotFound, WebhookValidationError } from "../errors/webhooks";
import { Endpoint, EndpointInput, IdentifierRow } from "../schemas/webhooks";
import { WebhookCrypto } from "../services/crypto";
import { queryRows } from "../services/database";
import type { EndpointId, OrganizationId } from "../types/webhooks";
import { validateEndpointUrl } from "../utils/url";

export const createEndpoint = Effect.fn("webhooks.createEndpoint")(function* (
  input: unknown
) {
  const body = yield* Schema.decodeUnknownEffect(EndpointInput)(input).pipe(
    Effect.mapError(
      () =>
        new WebhookValidationError({ message: "Invalid webhook subscription" })
    )
  );
  const url = yield* validateEndpointUrl(body.url);
  const cryptography = yield* WebhookCrypto;
  const id = yield* Effect.sync(() => `whe_${crypto.randomUUID()}`);
  const secret = yield* cryptography.createSecret();
  const encrypted = yield* cryptography.encrypt(secret, id);
  const [endpoint] = yield* queryRows(
    Endpoint,
    `INSERT INTO webhook_endpoints (id, organization_id, url, events, secret)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, organization_id AS "organizationId", url, events, enabled, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"`,
    [id, body.organizationId, url, [...new Set(body.events)], encrypted]
  );
  if (!endpoint) {
    return yield* new WebhookNotFound({ resource: "endpoint" });
  }
  return { endpoint, secret };
});

export const listEndpoints = Effect.fn("webhooks.listEndpoints")(function* (
  organizationId: OrganizationId
) {
  return yield* queryRows(
    Endpoint,
    `SELECT id, organization_id AS "organizationId", url, events, enabled, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
    FROM webhook_endpoints WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC, id DESC`,
    [organizationId]
  );
});

export const deleteEndpoint = Effect.fn("webhooks.deleteEndpoint")(function* (
  organizationId: OrganizationId,
  endpointId: EndpointId
) {
  const [deleted] = yield* queryRows(
    IdentifierRow,
    `WITH endpoint AS (
    UPDATE webhook_endpoints SET enabled = false, deleted_at = now() WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id
  ), cancelled AS (
    UPDATE webhook_deliveries SET status = 'cancelled', updated_at = now()
    WHERE organization_id = $1 AND endpoint_id IN (SELECT id FROM endpoint) AND status IN ('pending', 'retrying')
  ) SELECT id FROM endpoint`,
    [organizationId, endpointId]
  );
  if (!deleted) {
    return yield* new WebhookNotFound({ resource: "endpoint" });
  }
  return deleted;
});
