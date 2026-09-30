export const EVENT_INSERT_QUERY = `WITH inserted AS (
    INSERT INTO webhook_events (id, organization_id, source_key, event_type, payload)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (organization_id, source_key) DO NOTHING RETURNING *
  ), deliveries AS (
    INSERT INTO webhook_deliveries (id, organization_id, event_id, endpoint_id, url, secret)
    SELECT inserted.id || '_' || endpoint.id, inserted.organization_id, inserted.id, endpoint.id, endpoint.url, endpoint.secret
    FROM inserted JOIN webhook_endpoints endpoint ON endpoint.organization_id = inserted.organization_id
    WHERE endpoint.enabled AND endpoint.deleted_at IS NULL AND inserted.event_type = ANY(endpoint.events)
    ON CONFLICT (event_id, endpoint_id) DO NOTHING
  ) SELECT id FROM inserted`;

export const EVENT_SELECT_BY_SOURCE_QUERY =
  "SELECT id FROM webhook_events WHERE organization_id = $1 AND source_key = $2";
