# @notra/webhooks

Outbound webhooks for Notra, with Effect 4 programs and a Cloudflare Queues worker.
The dashboard exposes **Settings**, then **Webhooks**: endpoint creation, delivery
status filters, payload inspection, attempt history and retry for failed deliveries.
Public API clients use `webhooks.read` and `webhooks.write` scopes.

## Architecture

1. The terminal generation transition writes an event and snapshots matching
   subscriptions in **one Postgres statement**. A stable organization/source key
   makes repeated producer calls idempotent. No queue call is needed in that write.
2. A once-per-minute Cloudflare Cron Trigger reads the durable outbox and submits
   IDs to `notra-webhook-events`. The event consumer queues each delivery ID.
3. The delivery consumer atomically claims a delivery and creates its attempt row.
   It signs the exact stored payload, sends it and atomically records the result.
4. Recovery resubmits due deliveries independently of queue acknowledgement.
   Expired claims become retries; stale workers cannot overwrite
   a new attempt because completion is fenced by a unique lease token.

The application database remains authoritative. Queue duplicates are safe; delivery
is **at least once**, not exactly once. A receiver may process a request before a
worker crashes or times out. Deduplicate using `x-notra-delivery-id` (or the event ID
when multiple subscriptions should share a single business action).

All package orchestration, validation, errors, configuration, concurrency, crypto
and I/O adapters use Effect. Programs use `Effect.fn`, branded identifiers,
Schema decoding, typed tagged errors and injected services/layers. Promises exist
only at host and platform boundaries. Retry deadlines are persisted in Postgres;
workers do not sleep in memory using a retry schedule between attempts.

## Deployment

The code does not provision infrastructure or apply production migrations.

1. Apply `packages/db/migrations/0086_webhook_delivery_pipeline.sql` through the
   repository migration workflow against an initialized Notra database. The
   migration includes endpoints, events, deliveries, attempts, tenant-aware foreign
   keys, deduplication indexes and lease/retry fields. Unique indexes deliberately
   precede composite foreign keys. Follow `AGENTS.md` for fresh database setup.
2. From this package, create the two queues:

   ```sh
   bunx wrangler queues create notra-webhook-events
   bunx wrangler queues create notra-webhook-deliveries
   ```

3. Set Worker secrets with `bunx wrangler secret put DATABASE_URL` and
   `bunx wrangler secret put WEBHOOK_ENCRYPTION_KEY`. The worker uses Neon HTTP;
   the dashboard/API and generation producer use the normal Postgres connection.
   Point both at the **same database**. Use a dedicated base64-encoded 32-byte
   encryption key (`openssl rand -base64 32`), also configured in the API/dashboard.
4. Deploy the worker with `bun run deploy`, then deploy the API/dashboard changes.
5. Set `WEBHOOKS_ENABLED=true` in generation-producing app environments once the
   migration and worker are live. It defaults to false, so a deployment that
   predates the migration skips publishing instead of failing generation updates.
   Redeploy those apps after changing it.
6. Create an endpoint, generate a post through the API and inspect its delivery
   and attempt history. Allow up to a minute for initial dispatch/retries.

The worker has no public HTTP ingress, private network bindings, or admin token.
Subscription management is served by the authenticated Notra API and dashboard.
Dashboard members can inspect history; only owners/admins can create, delete, or
retry. API access is scoped using the existing API-key/OAuth middleware.

Keep the encryption key stable. Ciphertexts use AES-256-GCM with endpoint ID as
associated data. Changing the key without re-encrypting existing endpoint **and
pending delivery** secrets makes those deliveries unsignable. Key rotation and an
admin key migration tool are not included in this version.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/v1/webhooks` | Active subscriptions; no signing secrets |
| POST | `/v1/webhooks` | New endpoint and one-time signing secret |
| DELETE | `/v1/webhooks/{endpointId}` | Soft delete; cancel unsent deliveries |
| GET | `/v1/webhooks/deliveries?offset=0&status=all` | 25 deliveries plus `hasMore` |
| GET | `/v1/webhooks/deliveries/{deliveryId}` | Payload and individual attempts |
| POST | `/v1/webhooks/deliveries/{deliveryId}/retry` | Queue a failed delivery again |

Creation body:

```json
{
  "url": "https://your-workflow.app/webhook/notra",
  "events": ["post.generation.completed", "post.generation.failed"]
}
```

Events are currently limited to terminal **tracked post-generation jobs**:
`post.generation.completed` (`jobId`, `postId`), `post.generation.failed`
(`jobId`, `error`) and `post.generation.skipped` (`jobId`, `reason`). This does
not emit post edits, scheduled runs without a tracked job, brand analysis, or GEO
scan events. A completed job requires a post ID. The first terminal event for a
job wins, even if a retried producer later reports a different terminal outcome.

The terminal event is written before Redis job state. These stores cannot share a
transaction: if the Redis update fails, a receiver may see the terminal event
before the polling endpoint catches up. The generation step must retry; its stable
source key prevents creating a second event or snapshotting new subscriptions.

## Receiver verification

Requests include `x-notra-event`, `x-notra-event-id`, `x-notra-delivery-id`,
`x-notra-timestamp` (Unix seconds) and `x-notra-signature` (`v1,<base64 HMAC>`).
The signature is HMAC-SHA256 over UTF-8 bytes of:

```text
<eventId>.<deliveryId>.<timestamp>.<exact raw request body>
```

Decode the base64 signing secret after removing its `whsec_` prefix. Verify the
MAC with a constant-time crypto operation and reject timestamps more than five
minutes in the past **or future**. Verify before parsing/re-serializing the body.
The `verifySignature` Effect in `src/utils/signature.ts` implements this contract
using Web Crypto and requires only the endpoint secret, never Notra's encryption
key. Acknowledge promptly with a 2xx response and do expensive work asynchronously.

## Delivery policy and operations

- 10-second timeout including DNS validation; 60-second claim lease.
- Eight attempts per automatic cycle. Delays: 30s, 2m, 10m, 30m, 1h, 3h, 6h.
  Recovery runs every minute, so the actual retry may be later than its deadline.
- Network failures, timeouts, 408, 429 and 5xx retry. `Retry-After` may extend the
  delay up to 24 hours. Other HTTP failures, including redirects, are terminal.
- Manual retry is allowed for failed deliveries to active endpoints after a
  one-minute cooldown. It grants eight more attempts without resetting history,
  changing the payload, or changing the event/delivery IDs.
- HTTPS public hostnames on port 443 only; no credentials, IP literals, redirects,
  or private/reserved DNS answers. DNS is checked on every send. The supplied
  transport is specifically for Cloudflare public egress; do not use it in a
  server with internal-network access. DNS checking alone does not pin a hostname
  against rebinding between resolution and fetch.
- HTTP response bodies are neither buffered nor persisted. Logs contain status,
  duration and normalized failure reasons, not signing secrets or response data.
- Deletion cannot recall a request already claimed/sent. Retrying or pending work
  is cancelled, while existing history remains visible.
- Cleanup deletes completed event/delivery/attempt history older than 30 days in
  bounded batches. Active work is retained. Producer deduplication lasts as long
  as the corresponding event is retained; do not replay ancient source transitions.
- Monitor Worker logs for infrastructure/malformed-message
  failures. The database recovery scan remains the source of outstanding work;
  a queue acknowledgement is not proof that an endpoint received an event.

Inspired by [Marble's webhook observability write-up](https://marblecms.com/blog/webhook-observability).
The transactional outbox and lease recovery cover the persistence/queueing and
crashed-worker gaps described there.

## Development

```sh
bun install
bun run --cwd packages/webhooks test
bun run --cwd packages/webhooks check-types
bun run --cwd packages/webhooks build  # Worker bundle dry run, no deployment
```

Tests execute the production SQL migration in PGlite and inject Effect service
layers. They exercise idempotency, ownership, leases, retries, crypto and cleanup
without calling external endpoints or production databases.
