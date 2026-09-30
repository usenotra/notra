import { Effect, Option, Stream } from "effect";

import { RECOVERY_BATCH_SIZE, RETENTION_DAYS } from "../constants/delivery";
import { IdentifierRow, PipelineMetrics } from "../schemas/webhooks";
import { queryRows } from "../services/database";
import { WebhookQueues } from "../services/queue";
import type { EventId } from "../types/webhooks";

export const emitMetrics = Effect.fn("webhooks.emitMetrics")(function* () {
  const [metrics] = yield* queryRows(
    PipelineMetrics,
    `SELECT
    (SELECT count(*) FROM webhook_deliveries WHERE status IN ('pending', 'retrying', 'sending'))::int AS "openDeliveries",
    (SELECT count(*) FROM webhook_deliveries WHERE status IN ('pending', 'retrying') AND next_attempt_at <= now())::int AS "dueDeliveries",
    (SELECT COALESCE(max(EXTRACT(EPOCH FROM (now() - created_at))), 0)::int FROM webhook_deliveries WHERE status IN ('pending', 'retrying')) AS "oldestOpenSeconds",
    (SELECT count(*) FROM webhook_events WHERE dispatch_at <= now())::int AS "undispatchedEvents",
    (SELECT COALESCE(max(EXTRACT(EPOCH FROM (now() - created_at))), 0)::int FROM webhook_events WHERE dispatch_at <= now()) AS "oldestUndispatchedSeconds",
    (SELECT count(*) FROM webhook_attempts WHERE finished_at > now() - interval '1 minute' AND status_code BETWEEN 200 AND 299)::int AS "succeededLastMinute",
    (SELECT count(*) FROM webhook_attempts WHERE finished_at > now() - interval '1 minute' AND (status_code IS NULL OR status_code < 200 OR status_code >= 300))::int AS "failedLastMinute"`,
    []
  );
  if (metrics) {
    yield* Effect.logInfo("Webhook pipeline metrics").pipe(
      Effect.annotateLogs(metrics)
    );
  }
});

export const dispatchEvent = Effect.fn("webhooks.dispatchEvent")(function* (
  eventId: EventId
) {
  const queues = yield* WebhookQueues;
  yield* Stream.paginate("", (cursor: string) =>
    queryRows(
      IdentifierRow,
      `SELECT id FROM webhook_deliveries WHERE event_id = $1 AND id > $2 AND status IN ('pending', 'retrying') AND next_attempt_at <= now() ORDER BY id LIMIT $3`,
      [eventId, cursor, RECOVERY_BATCH_SIZE]
    ).pipe(
      Effect.map((rows) => {
        const last = rows.at(-1);
        return [
          last === undefined ? [] : [rows],
          last === undefined ? Option.none() : Option.some(last.id),
        ] as const;
      })
    )
  ).pipe(
    Stream.runForEach((rows) => queues.deliveries(rows.map((row) => row.id)))
  );
  yield* queryRows(
    IdentifierRow,
    "UPDATE webhook_events SET dispatch_at = NULL WHERE id = $1 RETURNING id",
    [eventId]
  );
});

export const recover = Effect.fn("webhooks.recover")(function* () {
  const queues = yield* WebhookQueues;
  yield* queryRows(
    IdentifierRow,
    `WITH expired AS (
    UPDATE webhook_deliveries SET status = CASE WHEN attempt_count >= attempt_limit THEN 'failed' ELSE 'retrying' END,
      lease_token = NULL, lease_expires_at = NULL, next_attempt_at = now(), updated_at = now()
    WHERE status = 'sending' AND lease_expires_at < now() RETURNING id, attempt_count
  ), attempts AS (
    UPDATE webhook_attempts a SET finished_at = now(), error = 'lease_expired_outcome_unknown'
    FROM expired e WHERE a.delivery_id = e.id AND a.attempt_number = e.attempt_count AND a.finished_at IS NULL
  ) SELECT id FROM expired`
  );
  yield* queryRows(
    IdentifierRow,
    `UPDATE webhook_deliveries d SET status = 'cancelled', updated_at = now()
    WHERE status IN ('pending', 'retrying') AND NOT EXISTS (SELECT 1 FROM webhook_endpoints e WHERE e.id = d.endpoint_id AND e.enabled AND e.deleted_at IS NULL) RETURNING id`
  );
  const events = yield* queryRows(
    IdentifierRow,
    `SELECT id FROM webhook_events WHERE dispatch_at <= now() ORDER BY dispatch_at, id LIMIT $1`,
    [RECOVERY_BATCH_SIZE]
  );
  yield* Effect.forEach(
    events,
    (row) =>
      Effect.gen(function* () {
        yield* queues.event(row.id);
        yield* queryRows(
          IdentifierRow,
          "UPDATE webhook_events SET dispatch_at = now() + interval '5 minutes' WHERE id = $1 AND dispatch_at IS NOT NULL RETURNING id",
          [row.id]
        );
      }),
    { concurrency: 5, discard: true }
  );
  const deliveries = yield* queryRows(
    IdentifierRow,
    `SELECT id FROM webhook_deliveries WHERE status IN ('pending', 'retrying') AND next_attempt_at <= now() ORDER BY attempt_count, next_attempt_at, id LIMIT $1`,
    [RECOVERY_BATCH_SIZE]
  );
  yield* queues.deliveries(deliveries.map((row) => row.id));
});

export const cleanup = Effect.fn("webhooks.cleanup")(function* () {
  return yield* queryRows(
    IdentifierRow,
    `DELETE FROM webhook_events WHERE id IN (
    SELECT e.id FROM webhook_events e WHERE e.created_at < now() - ($1 * interval '1 day') AND e.dispatch_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM webhook_deliveries d WHERE d.event_id = e.id AND d.status IN ('pending', 'retrying', 'sending'))
    ORDER BY e.created_at LIMIT $2
  ) RETURNING id`,
    [RETENTION_DAYS, RECOVERY_BATCH_SIZE]
  );
});
