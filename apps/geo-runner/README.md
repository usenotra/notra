# geo-runner

Effect service that runs one-off GEO scans: one prompt against up to five
models, judged exactly like a scheduled scan (`runGeoCheckAttempt` in
`@notra/geo-core`). Results go to `geo_adhoc_scans`, never to
`geo_mention_checks`, and the project's scheduled-scan claim is not touched.

Deployed on Railway from `apps/geo-runner/Dockerfile` (see `railway.json`).

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
