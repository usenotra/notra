# geo-runner

Effect service that runs one-off GEO scans: one prompt against up to five
models, judged exactly like a scheduled scan (`runGeoCheckAttempt` in
`@notra/geo-core`). Results go to `geo_adhoc_scans`, never to
`geo_mention_checks`, and the project's scheduled-scan claim is not touched.

Build the Railway service from `apps/geo-runner/Dockerfile` at the repository
root. Like `ai-traffic-ingest`, Hono owns the HTTP boundary and the shared
Effect package owns processing. The final image contains Bun and one bundle.

## Endpoints

All but `/health` and `/ready` need
`Authorization: Bearer $GEO_RUNNER_SECRET`. The secret must be at least 32
characters. Generate one with `openssl rand -hex 32`.

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness |
| `GET /ready` | Deployment readiness: validates configuration and Postgres |
| `GET /models?organizationId=&projectId=` | Models currently available to the project |
| `POST /scans` | Validate, store, and queue a scan. `202 { id }` |
| `POST /scans/:scanId/run` | Queue a scan another host already stored as `queued` |
| `GET /scans/:scanId?organizationId=&projectId=` | Status and results |

```sh
curl -X POST localhost:3000/scans \
  -H "authorization: Bearer $GEO_RUNNER_SECRET" -H "content-type: application/json" \
  -H "idempotency-key: $(uuidgen)" \
  -d '{"organizationId":"…","projectId":"…","prompt":"best geo tools","engines":["openai/gpt-5.4-mini"],"webSearch":true,"language":"English"}'
```

`Idempotency-Key` is required, scoped to the organization, and may contain up
to 128 characters. Retrying the same request with the same key returns the
original scan; reusing it for a different request returns `409`.

`engines` accepts one to five IDs returned by `GET /models`. `webSearch`
defaults to `true`, and `language` defaults to `English`.

The queue runs three scans concurrently with a backlog of 100. A full
backlog returns `503` and retains the queued row so the same idempotency key
can safely be retried on any replica. Queue deduplication is local; an atomic
database claim prevents multiple replicas from executing the same scan.
Shutdown clears only the local backlog. A queued scan lost with its process
needs a same-key retry or `POST /scans/:scanId/run`; there is no automatic
durable queue recovery. The stale sweep fails queued scans after 12 hours and
running scans after 15 minutes without a heartbeat. Claimed scans interrupted
by shutdown fail and release their billing reservation.

## Smoke test

The command targets the local development server by default. Development uses
a fixed local-only secret and binds the runner to `127.0.0.1`, so no secret
setup is needed:

```sh
bun run dev --filter=geo-runner
# In another terminal:
bun geo:smoke
```

The zero-argument local command idempotently creates a `GEO Smoke Test`
organization and project in the local database, then scans the example prompt
`What are the best AI content marketing tools?`.

To use an existing local project instead, pass its IDs and a prompt:

```sh
bun geo:smoke <organization-id> <project-id> "best GEO tools"
```

For production, configure `GEO_RUNNER_PROD_URL` and
`GEO_RUNNER_PROD_SECRET` once in the root `.env`, then pass only the flag:

```sh
bun geo:smoke --prod <organization-id> <project-id> "best GEO tools"
```

Pass a model ID as the optional fourth argument to override the catalog default.
The command checks health and readiness, starts one billable scan, polls it, and
prints the final result.

## Environment

`GEO_RUNNER_SECRET`, `DATABASE_URL`, `AI_GATEWAY_API_KEY` (no Vercel OIDC
outside Vercel), `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`PERPLEXITY_API_KEY`, `AUTUMN_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`. Set `AXIOM_TOKEN`, `AXIOM_GEO_DATASET`,
`AXIOM_AI_DATASET`, and optionally `AXIOM_ORG_ID` to drain structured evlog
events from the runner to Axiom.

## Railway setup

The `geo-runner` service is provisioned in `notra-prod`, production environment,
next to `ai-traffic-ingest`. Its service ID is
`f7c4e28f-bfcf-40c6-9658-96104977202b`.

| Setting | Value |
| --- | --- |
| Build root | `/` |
| Dockerfile | `apps/geo-runner/Dockerfile` |
| Healthcheck | `/ready`, timeout 60 seconds |
| Region | US East, `us-east4-eqdc4a` |
| Replicas | 1 initially |
| Port | `3000` |
| Restart | On failure, maximum 5 retries |
| Deployment draining | 30 seconds |
| Sleeping | Disabled |

Watch `/apps/geo-runner/**`, `/packages/**`, `/bun.lock`, `/package.json`,
`/bunfig.toml`, `/patches/**`, and `/.dockerignore`. Configure the service
directly in Railway. The deprecated `railway.json` mechanism is not required.
Postgres and Redis use references to the existing ingest service's variables.
The runner has its own generated bearer secret and provider/logging configuration.

The service currently has no source or deployment. Before activation:

1. Merge this PR and apply `0110_geo_adhoc_scans` through the normal database
   release process.
2. Set a valid `AUTUMN_SECRET_KEY`; this credential was unavailable during setup.
3. Connect `usenotra/notra`, branch `main`, and disable automatic deployments
   to follow the existing production release policy.
4. Deploy once and verify `/ready`, then run `geo:smoke --prod` against an
   authorized project. This command makes a billable provider request.
5. Add the service to the existing `railwayServices` list in
   `scripts/github/production-deploy.mjs` after its first healthy deployment.
   Use project `557ca18d-9de8-40ad-9fca-cf3d165f3c44`, environment
   `276f8b24-ccd7-4bf3-a6b6-1dbe9f7fe5c6`, and the service ID above.

## Result data

`GET /scans/:scanId` returns the scan's `id`, organization and project,
`status`, normalized `input`, `results`, `error`, and lifecycle timestamps.
Status is `queued`, `running`, `completed`, or `failed`.

| Per-model field | Meaning |
| --- | --- |
| `engine`, `prompt`, `answer`, `language`, `capturedAt` | Model identity, input, response, and capture time |
| `mentioned`, `position`, `sentiment`, `competitors`, `excerpt` | Judged brand visibility within this answer |
| `ownedSourceCited`, `sources` | Actual citations; search candidates alone do not count |
| `grounding` | Search queries and source candidates, when provided by the engine |
| `finishReason`, `zdrEnforced` | Provider completion and privacy metadata |
| `promptTokens`, `outputTokens`, `reasoningTokens`, `judgeTokens` | Usage reported by the answer and judge |
| `durationMs` | Time for the successful answer attempt and judge, excluding retries |
| `costUsd` | Estimated answer and judge cost before billing markup |

`results.skipped` lists requested models that produced no check, with reason
`zdr`, `no_web_search`, or `failed`. Missing provider metadata remains `null`.
These checks do not update scheduled scans, visibility history, or tracked prompts.

The bearer credential is a trusted backend credential. It grants access to the
service; organization/project IDs scope each operation but do not authenticate an
end user. A customer-facing caller must authorize membership before invoking it.
