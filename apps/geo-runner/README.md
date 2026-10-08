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

## CLI test tool

Start the runner on a free port, then call it with an existing organization's
project. The CLI uses the runner's authenticated HTTP API and needs no database
connection unless you explicitly request a local fixture.

```sh
PORT=3010 bun run dev --filter=geo-runner
# In another terminal:
bun geo:smoke --url http://127.0.0.1:3010 <organization-id> <project-id> "best GEO tools" --json
bun geo:smoke --help
```

Development binds to `127.0.0.1` and uses a fixed local secret. Set
`GEO_RUNNER_URL` to configure the default endpoint and `GEO_RUNNER_SECRET` to
use a custom credential. For a remote deployment, configure
`GEO_RUNNER_PROD_URL` and `GEO_RUNNER_PROD_SECRET` and use `--prod`:

```sh
bun geo:smoke --prod <organization-id> <project-id> "best GEO tools" --json
```

Select up to five available models with `--models model-id,model-id`, or pass
one model as the fourth positional argument. `--language German` sets the
answer language; `--no-web-search` disables web search. Otherwise the CLI picks
an available catalog default and its supported search behavior.

`--json` prints the final scan envelope to stdout, including its ID, normalized
input, status, results, and timestamps. Progress goes to stderr. A failed scan
prints its envelope and exits unsuccessfully. `--timeout 300` controls the
maximum wait in seconds.

The CLI prints its idempotency key before creating the scan and reuses it for
bounded retries after transient failures. Pass `--idempotency-key <key>` to
retry the same request after a process interruption. To read an existing scan
without creating another, use its ID and original scope:

```sh
bun geo:smoke --url http://127.0.0.1:3010 <organization-id> <project-id> --scan-id <scan-id> --json
```

Calling the command without arguments shows help and writes nothing. Use
`--fixture` to create the local `GEO Smoke Test` organization/project and run an
example prompt. Fixture creation requires both the runner and `DATABASE_URL`
to use a loopback host and refuses production mode.

A scan can make billable provider requests. Fixtures do not override billing
or turn provider calls into mocks.

## Billing and product integration

One-off scans currently use the existing `ai_answers` allowance. They reserve
one unit per eligible model and consume one unit per successful check. A scan
that produces no check releases an answer-quota reservation. When the shared
billing adapter falls back to `ai_credits`, it charges retained usage from
successful checks and reported answer usage from final empty-answer or
judge-error outcomes. Usage from earlier failed retries or calls that fail
without reporting usage is not fully captured. The
`source: geo_adhoc_scan` property identifies these charges but does not create
a separate balance.

Separate billing is feasible with the existing lock, confirmation, release,
and model-cost mechanisms. `packages/ai/src/billing/github-mention-billing.ts`
already uses a dedicated balance for another product feature. For one-off GEO
scans, a dedicated cost-based balance would account for the different model
prices without changing shared model routing, judging, or ZDR policy.
[Autumn supports independent metered balances](https://docs.useautumn.com/documentation/concepts/features).

Before implementing that policy, choose the billing unit, allowance or package,
price, and behavior when its balance runs out. A proposed `geo_adhoc_credits`
feature would need its own Autumn catalog entry and adapter. Do not fall back
to `ai_answers` or the shared credit pool unless that is the chosen policy.
No separate feature, plan, price, or customer billing configuration is enabled
by this PR.

The CLI is an operator tool with a trusted service credential. A later dashboard
or API entry point must authorize the user's organization membership before
calling the runner and enforce the chosen standalone entitlement. It must keep
the bearer secret on the backend. An `ai_answers` access check would prevent a
truly independent scan package from working for customers without that feature.

Results stay in `geo_adhoc_scans` and do not change scheduled visibility. The
runner has no automatic restart recovery. Billing-finalization errors currently
emit `geo.scan.billing_failed`; completion does not prove that Autumn confirmed
the charge. Reconciliation and authenticated end-user integration remain
production follow-up work.

## Environment

`GEO_RUNNER_SECRET`, `DATABASE_URL`, `AI_GATEWAY_API_KEY` (no Vercel OIDC
outside Vercel), `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`PERPLEXITY_API_KEY`, `AUTUMN_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`. Set `AXIOM_TOKEN`, `AXIOM_GEO_DATASET`,
`AXIOM_AI_DATASET`, and optionally `AXIOM_ORG_ID` to drain structured evlog
events from the runner to Axiom.

See [verification results](TESTING.md) for the Daytona tests and their limits.

## Railway setup

The previously created Railway service was deleted at the user's request.
There is no active `geo-runner` service or deployment. The settings below are
instructions for a future deployment.

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
A future service needs Postgres and Redis references, its own bearer secret,
and provider, billing, and logging credentials.

Before activation:

1. Merge this PR and apply `0114_geo_adhoc_scans` through the normal database
   release process.
2. Decide the scan billing policy and configure the corresponding Autumn
   entitlement. A real `AUTUMN_SECRET_KEY` is required in production.
3. Create the service only when deployment is requested. Connect
   `usenotra/notra`, branch `main`, and disable automatic deployments to follow
   the existing production release policy.
4. Deploy and verify `/ready`, then run `geo:smoke --prod` against an authorized
   project. This command makes a billable provider request.
5. Add the newly created service's actual IDs to the existing `railwayServices`
   list in `scripts/github/production-deploy.mjs` after its first healthy
   deployment.

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
