# AI traffic ingestion

Hono HTTP service on Bun for `POST /api/geo/ingest`, deployed on Railway.
Hono handles routing and HTTP responses. The Effect processing pipeline lives
in `packages/geo-core/src/ingest` and is also used by the dashboard's
compatibility handler. `Effect.runPromise` is the boundary between Hono and
the pipeline; typed failures are mapped to HTTP responses with `Effect.match`.

## Responsibilities

- This service verifies tracking tokens, classifies visitors, checks project
  hosts and token revocation, applies the existing Redis rate limit, resolves
  journeys, and writes tracked events to Tinybird.
- The dashboard still owns projects, settings, token issuance and rotation,
  installation snippets, and traffic queries.
- Both use the same Postgres, Redis, Tinybird workspace and signing secret.
  Shared Redis keys preserve cache invalidation and the per-organization limit
  across replicas and during the migration.

With the default write buffer, tracked events receive `202` after entering RAM,
before Tinybird accepts the write. A process crash can lose these acknowledged
events; this is not a durable queue. With buffering disabled or full, `202` waits
for Tinybird acceptance. Deliberately dropped traffic also receives `202`.
Analytics run in the background. SIGTERM stops accepting
requests and waits for active requests and background work before exiting.
Rate-limit hits return `429`; Redis transport failures and limiter timeouts return
`502` without writing an event. Redis availability is required for tracked ingestion.
Token generation is still checked against Postgres and fails closed on an outage.

Before identity and host lookups, tracked AI envelopes and malformed signed payloads
pass a separate 1,000-request-per-minute admission limit keyed by organization,
project and token generation. Token rotation gets a fresh admission budget, and
revoked tokens cannot consume the existing organization-wide accepted-traffic quota.
Human/unknown traffic keeps its zero-I/O drop path.

## Local development

From the repository root:

```sh
bun install
bun run dev --filter=ai-traffic-ingest
bun run --filter=ai-traffic-ingest test
bun run --filter=ai-traffic-ingest check-types
```

The root dev command loads the root `.env`. The default local port is `3101`.
See `.env.example` in this directory for the service-specific variables.

## Connection pooling

The standalone service retains established Postgres connections up to its
existing pool maximum instead of discarding them after the default 10-second
idle timeout. It does not increase the maximum or pre-open connections. This
avoids recurring connection setup on sparse traffic and later bursts; initial
connections and database-side reconnects can still be slow. Dashboard and API
pool settings are unchanged.

## Railway configuration

Create an `ai-traffic-ingest` service in the `notra` project. Keep the build root
at `/`, since the app imports workspace packages. Configure the service with:

| Setting | Value |
| --- | --- |
| Builder | Dockerfile |
| Dockerfile path | `apps/ai-traffic-ingest/Dockerfile` |
| Healthcheck | `/readyz` |
| Region | US East (Virginia), next to Postgres and Upstash |
| Healthcheck timeout | 60 seconds |
| Public target port | 3000 |
| Restart policy | On failure, maximum 5 retries |
| App sleeping | Disabled |

Set `PORT=3000` to match the public target port, and
`RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60` so Railway allows in-flight work to
finish when replacing a deployment. The healthcheck uses `/readyz` so a deploy
with missing credentials is never promoted. Every tracked hit reads Postgres and
Upstash before the SDK's 2 second timeout, so run the service in one region next
to them rather than in several distant ones.

Watch `/apps/ai-traffic-ingest/**`, `/packages/**`, `/bun.lock`, `/package.json`,
`/bunfig.toml`, `/patches/**`, and `/.dockerignore`. Deploy from the repository
root with `railway up --service ai-traffic-ingest --environment production --ci`
after linking the project. A CLI upload does not configure GitHub auto-deploys;
connect the repository and branch in Railway after merging the code.

The Docker image contains only Bun and the built bundle. No Next.js server,
build-time credentials, or database migration is required. Build locally with:

```sh
docker build -f apps/ai-traffic-ingest/Dockerfile -t notra-ai-traffic-ingest .
```

### Environment variables

Copy these values from the existing dashboard configuration into the service:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing Notra Postgres database |
| `UPSTASH_REDIS_REST_URL` | Existing Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Existing Redis credentials |
| `TINYBIRD_TOKEN` | Existing token with ingestion permissions |
| `GEO_INGEST_SECRET` | The exact signing secret used by the dashboard |
| `TINYBIRD_BASE_URL` | Existing Tinybird endpoint, especially for a non-default region |

`BEACON_INGEST_SECRET` is supported when `GEO_INGEST_SECRET` is unset.
`TINYBIRD_URL` remains a supported alias for the Tinybird base URL.
Optional telemetry variables are `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`,
`NEXT_PUBLIC_POSTHOG_HOST`, `AXIOM_TOKEN`, and `AXIOM_ORG_ID`. Logs go to the
`notra-geo-scan` dataset by default; set `AXIOM_GEO_DATASET` only to override it.
Set `PORT=3000` in Railway to match the configured public target port.

Without required configuration, the process starts but rejects ingestion with
`503`. `GET /healthz` checks process liveness and returns `200`.
`GET /readyz` returns `503` until all required values are present, then `200`.
Readiness checks configuration only, not external connectivity or credential
validity. Check a real AI request and its appearance in the dashboard before
switching production traffic.

## Switch traffic

1. Add the shared credentials in Railway, redeploy, and verify `/readyz`.
2. Send an AI request through a site with a valid project token and confirm
   that Tinybird and the dashboard receive it.
3. Set `GEO_INGEST_URL` to the service's public HTTPS origin in the dashboard
   and public API environments, then redeploy those apps.
4. New setup snippets point directly to Railway. The dashboard uses a
   `beforeFiles` rewrite to proxy existing `/api/geo/ingest` installs to the
   service without invoking its local handler or asking customers to rotate
   tokens.

The SDK's default origin is `https://ingest.usenotra.com`. Verify that this host
serves `/api/geo/ingest` with the shared credentials before publishing an SDK
release that uses it. Self-hosted SDK installations must configure `endpoint`
explicitly; they do not inherit the dashboard's `GEO_INGEST_URL`.

Leave `GEO_INGEST_URL` unset until Railway is ready. The existing dashboard
endpoint continues using the shared pipeline locally.

### Roll back

1. Unset `GEO_INGEST_URL` and redeploy the dashboard and API. This restores the
   dashboard's local handler and makes newly generated snippets use its origin.
2. Sites using the SDK default or an explicit dedicated-service URL must set
   `endpoint: "https://app.usenotra.com"` and redeploy. Use the deployment's
   dashboard origin for self-hosted installations.
3. Verify a tracked request reaches Tinybird through the dashboard handler.

Removing `GEO_INGEST_URL` only changes dashboard routing and generated snippets.
It does not redirect requests sent to `ingest.usenotra.com` or another dedicated
origin. The SDK has no automatic dashboard fallback. Direct clients continue
using the dedicated service until their endpoint is changed and redeployed.

## Monitoring in Axiom

Every ingest request, on Railway and on the dashboard fallback, emits one
`geo.ingest` event to the `notra-geo-scan` dataset with `outcome`
(`ingested`, `dropped`, `rejected`, `failed`), `reason`, `status`,
`durationMs`, `ingestMs` (Tinybird write), `visitorType`, `source`, `agent`,
`organizationId`, `projectId`, `runtime` (`railway`, `vercel`, `local`),
`region` and `weight`. Dropped human traffic is sampled at 5%, so always count
with `sum(weight)` instead of `count()`.

Requests include `payloadMs` for reading and validating the body; this can also
expose slow uploads rather than backend latency. Tracked requests include
`admissionMs`, `identityMs`, `hostsMs` and
`rateLimitMs` for completed stages, including stages that failed. Identity and
host lookup run concurrently, so do not sum them to derive total duration.
`identityMs` includes pool wait, connection setup and the token-generation query;
it does not distinguish those costs internally. Human drops do not run the
Redis/database stages. These timings preserve the existing authentication and
admission order.

```kusto
// Requests per second
['notra-geo-scan'] | where event == 'geo.ingest'
| summarize rps = sum(todouble(weight)) / 60 by bin(_time, 1m), tostring(runtime)

// Ingested events per second, by AI source
['notra-geo-scan'] | where event == 'geo.ingest' and outcome == 'ingested'
| summarize eps = count() / 60.0 by bin(_time, 1m), tostring(source)

// Totals by outcome and reason
['notra-geo-scan'] | where event == 'geo.ingest'
| summarize requests = sum(todouble(weight)) by tostring(outcome), tostring(reason)

// Latency and Tinybird write time
['notra-geo-scan'] | where event == 'geo.ingest' and outcome == 'ingested'
| summarize p50 = percentile(durationMs, 50), p95 = percentile(durationMs, 95),
    p99 = percentile(durationMs, 99), tinybird_p95 = percentile(ingestMs, 95)
    by bin_auto(_time)

// Error rate and top failure messages
['notra-geo-scan'] | where event == 'geo.ingest' and outcome == 'failed'
| summarize failures = count() by tostring(reason), tostring(errorMessage)

// Top organizations by ingested events
['notra-geo-scan'] | where event == 'geo.ingest' and outcome == 'ingested'
| summarize events = count() by tostring(organizationId) | top 20 by events
```
