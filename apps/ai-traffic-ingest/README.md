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

Events receive `202` only after Tinybird accepts the write, or when the pipeline
deliberately drops them. Analytics run in the background. SIGTERM stops accepting
requests and waits for active requests and background work before exiting.
Rate-limit hits return `429`; Redis transport failures and limiter timeouts return
`502` without writing an event. Redis availability is required for tracked ingestion.
Token generation is still checked against Postgres and fails closed on an outage.

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

## Railway configuration

Create an `ai-traffic-ingest` service in the `notra` project. Keep the build root
at `/`, since the app imports workspace packages. Configure the service with:

| Setting | Value |
| --- | --- |
| Builder | Dockerfile |
| Dockerfile path | `apps/ai-traffic-ingest/Dockerfile` |
| Healthcheck | `/healthz` |
| Healthcheck timeout | 60 seconds |
| Public target port | 3000 |
| Restart policy | On failure, maximum 5 retries |
| App sleeping | Disabled |

Set `PORT=3000` to match the public target port, and
`RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60` so Railway allows in-flight work to
finish when replacing a deployment.

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
`NEXT_PUBLIC_POSTHOG_HOST`, `AXIOM_TOKEN`, `AXIOM_GEO_DATASET`, and `AXIOM_ORG_ID`.
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

Leave `GEO_INGEST_URL` unset until Railway is ready. The existing dashboard
endpoint continues using the shared pipeline locally. To roll back, unset the
variable and redeploy the dashboard and API. Sites explicitly configured with
the Railway URL must update their endpoint separately.
