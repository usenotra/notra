import { Effect } from "effect";

import {
  DUE_DELIVERIES_PER_SWEEP,
  RECOVERY_BATCH_SIZE,
  RETENTION_DAYS,
} from "../constants/delivery";
import { CountRow, IdentifierRow, PipelineMetrics } from "../schemas/webhooks";
import { decodeRows, WebhookDatabase } from "../services/database";
import { WebhookQueues } from "../services/queue";
import type { SqlStatement } from "../types/services";

const expireLeases: SqlStatement = {
  sql: `WITH expired AS (
    UPDATE webhook_deliveries SET status = CASE WHEN attempt_count >= attempt_limit THEN 'failed' ELSE 'retrying' END,
      lease_token = NULL, lease_expires_at = NULL, next_attempt_at = now(), updated_at = now()
    WHERE status = 'sending' AND lease_expires_at < now() RETURNING id, attempt_count
  ), attempts AS (
    UPDATE webhook_attempts a SET finished_at = now(), error = 'lease_expired_outcome_unknown'
    FROM expired e WHERE a.delivery_id = e.id AND a.attempt_number = e.attempt_count AND a.finished_at IS NULL
  ) SELECT count(*)::int AS count FROM expired`,
  parameters: [],
};

const cancelOrphans: SqlStatement = {
  sql: `WITH cancelled AS (
    UPDATE webhook_deliveries d SET status = 'cancelled', updated_at = now()
    WHERE status IN ('pending', 'retrying') AND NOT EXISTS (SELECT 1 FROM webhook_endpoints e WHERE e.id = d.endpoint_id AND e.enabled AND e.deleted_at IS NULL) RETURNING 1
  ) SELECT count(*)::int AS count FROM cancelled`,
  parameters: [],
};

// Deliveries are the source of truth for outstanding work, so an event only
// needs to be marked dispatched to become eligible for retention cleanup.
const markEventsDispatched: SqlStatement = {
  sql: `WITH dispatched AS (
    UPDATE webhook_events SET dispatch_at = NULL WHERE dispatch_at <= now() RETURNING 1
  ) SELECT count(*)::int AS count FROM dispatched`,
  parameters: [],
};

const removeExpiredEvents: SqlStatement = {
  sql: `WITH removed AS (
    DELETE FROM webhook_events WHERE id IN (
      SELECT e.id FROM webhook_events e WHERE e.created_at < now() - ($1 * interval '1 day') AND e.dispatch_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM webhook_deliveries d WHERE d.event_id = e.id AND d.status IN ('pending', 'retrying', 'sending'))
      ORDER BY e.created_at LIMIT $2
    ) RETURNING 1
  ) SELECT count(*)::int AS count FROM removed`,
  parameters: [RETENTION_DAYS, RECOVERY_BATCH_SIZE],
};

const selectDueDeliveries: SqlStatement = {
  sql: `SELECT id FROM webhook_deliveries WHERE status IN ('pending', 'retrying') AND next_attempt_at <= now()
    ORDER BY next_attempt_at, id LIMIT $1`,
  parameters: [DUE_DELIVERIES_PER_SWEEP],
};

const selectMetrics: SqlStatement = {
  sql: `SELECT
    (SELECT count(*) FROM webhook_deliveries WHERE status IN ('pending', 'retrying', 'sending'))::int AS "openDeliveries",
    (SELECT COALESCE(max(EXTRACT(EPOCH FROM (now() - created_at))), 0)::int FROM webhook_deliveries WHERE status IN ('pending', 'retrying')) AS "oldestOpenSeconds",
    (SELECT count(*) FROM webhook_attempts WHERE finished_at > now() - interval '1 minute' AND status_code BETWEEN 200 AND 299)::int AS "succeededLastMinute",
    (SELECT count(*) FROM webhook_attempts WHERE finished_at > now() - interval '1 minute' AND (status_code IS NULL OR status_code < 200 OR status_code >= 300))::int AS "failedLastMinute"`,
  parameters: [],
};

const countOf = Effect.fn("webhooks.countOf")(function* (rows: unknown) {
  const [row] = yield* decodeRows(CountRow, rows);
  return row?.count ?? 0;
});

/**
 * The once-per-minute pass: recovers expired leases, cancels work for removed
 * endpoints, retires old events and queues every due delivery. All database
 * work is one transaction, so an idle pass costs a single Neon round trip.
 */
export const sweep = Effect.fn("webhooks.sweep")(function* () {
  const database = yield* WebhookDatabase;
  const queues = yield* WebhookQueues;
  const [expired, cancelled, dispatched, removed, due, metrics] =
    yield* database.transaction([
      expireLeases,
      cancelOrphans,
      markEventsDispatched,
      removeExpiredEvents,
      selectDueDeliveries,
      selectMetrics,
    ]);
  const deliveryIds = (yield* decodeRows(IdentifierRow, due)).map(
    (row) => row.id
  );
  const [pipeline] = yield* decodeRows(PipelineMetrics, metrics);
  const summary = {
    expiredLeases: yield* countOf(expired),
    cancelledDeliveries: yield* countOf(cancelled),
    dispatchedEvents: yield* countOf(dispatched),
    removedEvents: yield* countOf(removed),
    queuedDeliveries: deliveryIds.length,
  };
  yield* queues.deliveries(deliveryIds);
  yield* Effect.logInfo("Webhook pipeline metrics").pipe(
    Effect.annotateLogs({ ...pipeline, ...summary })
  );
  return summary;
});
