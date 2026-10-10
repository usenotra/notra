# Notra observability

Internal monitoring in the existing Railway **notra-prod / production** project.

Region update: the approved migration to US East/Virginia (`us-east4-eqdc4a`)
completed on **2026-10-10**, matching production ingest. All six runnable services
reached `SUCCESS`, all four active volumes are `READY` in US East, historical
metrics/logs remain queryable, and all four dashboards match source. Four recovery
snapshots were created before migration. Vercel remains undeployed; application
telemetry was not activated. The region-only patch changed no application config,
secrets or domains. The post-migration IaC plan reports no changes. See
[`the migration checklist`](../../.railway/README.md#us-east-migration).

- Operations: <https://grafana.usenotra.com/d/notra-overview> (30-second refresh).
- Usage accounting: <https://grafana.usenotra.com/d/notra-accounting> (no
  auto-refresh).
- Vercel platform: <https://grafana.usenotra.com/d/notra-vercel> (five-minute refresh).
- API and MCP: <https://grafana.usenotra.com/d/notra-surfaces> (30-second refresh).
- OTLP/HTTP: `https://telemetry.usenotra.com` (bearer authentication required).
- Company login: Cloudflare Access email OTP, verified `@usenotra.com` addresses,
  eight-hour sessions. Grafana automatically creates **Viewer** accounts.

## Architecture and trust boundary

```text
team → Cloudflare Access → JWT-validating Tunnel → Grafana
applications → authenticated OTLP collector → Loki / Prometheus → Grafana
                                            Prometheus → blackbox probes
```

All seven monitoring services have **no public Railway domains or TCP proxies**.
Only the tunnel exposes Grafana, and it validates the Access JWT audience before
forwarding the Cloudflare-supplied identity header. The telemetry ingress accepts
only `/v1/logs` and `/v1/metrics`; all other paths return 404. Traces are not enabled.

Grafana auth-proxy trusts the private Railway network. Other services in this
project are therefore trusted infrastructure: they can reach private origins.
Do not add a public Grafana origin, expose Loki/Prometheus, or connect untrusted
workloads to this project. A project-level isolation or an origin-side JWT proxy
is needed if that trust assumption changes. Never use a client-supplied identity
header without the Access-validated tunnel.

## Coverage

| Signal | Coverage |
| --- | --- |
| Availability, TLS expiry, HTTP response time | Live probes of the marketing site, app, API ping, ingest readiness and MCP protected-resource metadata from US East/Virginia. Not browser or authenticated-page performance. |
| Monitoring health | Live scrape health for Prometheus, Loki, collector and blackbox. |
| API latency, 5xx, request counts | Existing `api.request.completed` events exported when application telemetry is enabled. Only instrumented requests; not every edge request. |
| AI throughput, tokens, first-chunk latency, failures | Existing `ai.call.*` events exported when enabled. |
| AI gateway charges / BYOK inference value | Staged code exports separate components: Vercel generation enrichment and OpenRouter response usage. Stable cost IDs deduplicate reports. Missing provider cost is unknown, not zero. Existing billing totals are unchanged. |
| Customer attribution | Organization ID filters and top-organization request/AI usage panels. Attribution requires the call/request's organization context. |
| Traffic ingest | Sample-weighted `geo.ingest` outcomes when enabled; not durable or lifetime totals. |
| Ingest capacity | Staged `geo.ingest.runtime` projection preserves RSS/heap and backpressure samples. Requires the updated exporter and ingest telemetry to be deployed/enabled; missing samples are not zero. |
| Actual invoices / purchased vs promotional credits | **Not implemented.** Needs provider billing reconciliation; inference usage cannot establish cash paid. |
| Individual-user attribution | Staged API OAuth/RPC context and MCP OAuth telemetry preserve authenticated opaque user IDs. API keys do not invent user identity. Jobs and remaining request surfaces still require their own authenticated context. |
| MCP integrations | Staged `mcp.tool.completed` events cover logical external tool calls, activation failures, `isError` results and OAuth retry duration. No tool inputs, outputs, descriptions or URLs. |
| Standalone Notra MCP server | Optional independent OTLP export is staged in `/Users/janburzinski/coding/notra-mcp`. Deploy and enable there separately. Counts dispatched tool calls, not discovery, initialization or requests rejected before dispatch. OAuth has verified organization/user attribution; API keys do not. |
| Vercel system metrics | Dynamic private exporter covers the entire available system catalog, currently 107 metrics, plus four bounded HTTP/cache/runtime breakdowns. Live read checks passed. Permanent collection is blocked on a separate Vercel token; its creation API returned 403. |
| Hosted sites / browser performance | Per-request Workers instrumentation and Web Vitals are **not implemented**. |
| Alert notifications | **Not configured.** Panels are available for extension. |

The application changes are not deployed or activated in production. Until that
happens, application panels correctly show **no data**. Validation events use a
separate `validation` environment and are excluded by the default production
filter. Synthetic endpoint probes do not use this environment filter.

Dashboard RPC organization attribution uses membership-verified targets, not the
active UI organization. Each procedure has an isolated operational context;
an HTTP request that authorizes multiple organizations has no single organization
field. Denied or invalid targets never acquire attribution. A procedure accessing
multiple organizations likewise remains unattributed unless a call explicitly
supplies its authorized target.
The existing final request emit overrides earlier warning attribution, including
clearing stale organization/user fields; it does not emit a second event or
change streaming response lifetime. Global exception analytics do not infer a
target organization from the active UI session.

### Dashboard scope

Operations keeps the existing `notra-overview` URL and 30-second refresh. Historical
selected-range gateway usage, BYOK usage value, gateway balance and organization
rankings (original panel IDs 10, 11, 12, 16 and 18) move intact to the provisioned
`notra-accounting` dashboard, with auto-refresh disabled. Native dashboard links
carry environment, organization and selected time range both ways. Change the
range or manually refresh accounting when you need another observation.

Numeric Loki queries retain only the event, filters, grouping and numeric fields
they use. Cost/ranking and runtime queries use explicit JSON extraction. Queries
with optional grouping fields use full JSON parsing followed by `keep`: native
Loki otherwise turns missing/null fields into empty-string labels, changing
grouping semantics. Nested token/first-chunk fields retain their original aliases.
The logs panel intentionally keeps full JSON parsing for details. Organization regex is
trusted-team input, not authorization. The shared gateway balance and ingest
capacity are not organization-scoped; their panels say so.

The two capacity panels show latest ingest RSS/heap and active requests, pending
tasks, buffered events and database waiters over a five-minute sample window.
They are service-level samples, not replica sums or durable counters. Replica and
deployment IDs are excluded from the runtime projection. No Prometheus process,
collector queue or export-failure panels were added: metric names for the pinned
Collector were not verified locally. No volume-used metric is exported by the
current scrape configuration.

## Enable application telemetry

### Vercel platform exporter

The approved IaC extension created private `vercel-metrics`, service ID
`f06fc2aa-26b6-420a-8077-094555f429ad`, without changing application services or
volumes. The next IaC plan reported no changes. It remains **undeployed**, not
silently populated with static values or a copied CLI login. Its Prometheus
scrape is expected to be down until activation.

Create a **90-day token scoped only to the Notra team** in
<https://vercel.com/account/tokens> and set sealed `VERCEL_MONITORING_TOKEN` on
that Railway service. Token creation with the current CLI login returned HTTP
403, and the desktop browser is disconnected; no token was created or copied.
Do not paste tokens into chat, source, screenshots, command-line arguments or
plan artifacts. Vercel's team token permits writes, even though this client's
fixed-origin API allowlist only reads the catalog and issues metric queries.
`VERCEL_TEAM_ID`, `PORT=9091` and UID 1000 are already in IaC. Then deploy only
`infra/observability/vercel` using the explicit project/environment/service IDs
and verify that exact deployment reaches `SUCCESS`, private health, scrape,
catalog/query success, freshness and actual values. `/healthz` is process
liveness, not Vercel access validation.

The exporter polls every five minutes, with two workers, 30-second request
timeouts, no overlapping polls and no unbounded retries. API requests contain
at most 30 outputs and group by the catalog's `derivedFrom.event`, not metric-name
heuristics; separate Drive events cannot share a query. The system
catalog is paginated and bounded. Results at the 500-series cap fail visibly
rather than implying complete coverage. Labels contain only project/environment
and reviewed platform HTTP/cache/runtime dimensions: never IP, URLs, paths,
headers, key IDs, session IDs, generation IDs, or captured AI content. Empty
platform dimensions remain empty; missing dimensions become `unattributed`.

Measurements are **five-minute window gauges**, ending at least ten minutes
before the poll to allow ingestion, not monotonic totals. Do not use
`rate`, `increase` or sum repeated scrapes to calculate historical totals.
Failed groups have no stale measurement samples; empty successful queries
have a separate no-data signal. Catalog metrics without an environment
dimension are available in the full-catalog explorer. Count and token/cost
aggregation are distinct; gateway usage is not provider invoices or credit
reconciliation. No priced Drains/Speed Insights Plus upgrade, raw log drain or
trace pipeline was enabled. Web Vitals/Analytics catalog entries cannot create
browser observations if the corresponding client collection is absent.

### Application event exporters

Deploy the accompanying application changes, then configure each Node/Bun app:

```dotenv
NOTRA_OTLP_ENDPOINT=https://telemetry.usenotra.com
NOTRA_OTLP_TOKEN=<collector's sealed NOTRA_OTLP_TOKEN>
NOTRA_TELEMETRY_SERVICE_NAME=notra-api
```

Use distinct service names, for example `notra-dashboard`, `notra-api`, and
`notra-traffic-ingest`. An app in this Railway project can instead use
`http://otel-collector.railway.internal:4318`. Public endpoints must use HTTPS.
Do not import this Node-based exporter into a Cloudflare Worker.

Either missing endpoint or token disables the extra drain. Invalid endpoints also
disable only OTLP with a warning that does not include the configured value.
Axiom remains active. URL credentials, query strings and fragments are rejected.
The pinned evlog transport is patched to reject redirects for all drain requests,
including OTLP and Axiom, without changing batching, retries or timeout budgets.
Axiom diagnostics never print provider response bodies, including successful
partial-ingest warnings: only validated failure counts and fixed categories
are retained, without replaying successful batches. Its rich event payloads
are unchanged. Regression tests exercise actual loopback 307/308 responses.
Exported events have an explicit content-free allowlist: no prompts, generated
content, URLs, emails, request headers, credentials or error text. Organization,
user and generation IDs remain sensitive operational identifiers. IDs are
shape/length checked; free-text `reason` is excluded except for reviewed
`geo.ingest` reason codes.
The separate `geo.ingest.runtime` allowlist accepts only finite nonnegative numeric
capacity fields (safe integers for request/task/buffer/pool counts). Strings,
unknown fields and free-text runtime reasons are excluded. These fields do not
cross the projection on any other event.

The exporter uses batches of 50, a 1,000-event memory buffer, three attempts and
three-second HTTP timeouts. It is best-effort telemetry, not an accounting ledger.
Request/shutdown flushing waits for events present when flush was called, not
later arrivals. Watch `[otlp] dropped …`
messages; a terminated process or exhausted retry budget can lose app-side events.
The collector's Loki sending queue is persistent and bounded to 1,000 batches.
The source config retries retryable downstream errors without a time limit, including
outages longer than five minutes. This is not a delivery guarantee: permanent
export errors drop the affected batches, a full queue rejects new batches, and
the batch processor holds data in memory before enqueueing, which can be lost
on collector termination. Prolonged outages can fill the bounded queue.

## Deployment and storage

Project: `557ca18d-9de8-40ad-9fca-cf3d165f3c44`.
Environment: `276f8b24-ccd7-4bf3-a6b6-1dbe9f7fe5c6`.

| Directory | Railway service | Private port | Persistent mount |
| --- | --- | --- | --- |
| `grafana` | `grafana` | 3000 | `/var/lib/grafana` |
| `prometheus` | `prometheus` | 9090 | `/prometheus` |
| `loki` | `loki` | 3100 | `/loki` |
| `collector` | `otel-collector` | 4318, 8888, 8889; health 13133 | `/var/lib/otelcol` |
| `blackbox` | `blackbox` | 9115 | — |
| `tunnel` | `monitoring-tunnel` | health/metrics 2000 | — |
| `vercel` | `vercel-metrics` (undeployed pending token) | 9091 | — |

Each directory is an independent Docker build context. Railway configuration now
lives in [`.railway/railway.ts`](../../.railway/railway.ts), replacing the unused
legacy `railway.json` files. The named `observability` partial covers only the six
original monitoring services and four existing volumes; the approved Vercel
extension now brings this to seven services and four volumes. `ai-traffic-ingest` is excluded.
Secrets are preserved remotely. On 2026-10-10, the approved no-change pinned IaC
plan was applied, adopting exactly those ten resources into `observability`.
The post-apply plan reported no changes; deployment/volume IDs and the application
ingest deployment remained unchanged. All 71 post-adoption live checks passed. See the
[IaC workflow](../../.railway/README.md) before planning or applying changes.
Configurations target one replica in `us-east4-eqdc4a`. Images are digest-pinned.
Railway mounts volumes as root: persistent services start with
`RAILWAY_RUN_UID=0`, initialize ownership, then drop to UID 472 (Grafana),
65534 (Prometheus), or 10001 (Loki/collector). Only the collector recursively fixes
ownership, to handle its pre-existing queue files. No data is deleted.

### Live deployment verification (2026-10-10)

The original six monitoring deployments reached `SUCCESS`. Both original dashboards match source;
organization ranking filters, capacity panels and the parser/grouping corrections
are live. Loki reports query/TSDB parallelism 4; the collector's running config
sets `max_elapsed_time: 0`. All nine scrape targets and four endpoint probes are
healthy. The 71 live checks also verified Access/authentication, privacy projection,
organization attribution, exact deduplicated cost/runtime fixture values and OTLP
metrics reaching Prometheus. Fixtures remain in the `validation` environment.

The Vercel/API/MCP extension was subsequently deployed and verified on the same
day. All four provisioned dashboards now match source. Grafana and Prometheus
releases listed below reached `SUCCESS`. All ten currently runnable scrape
targets and all five probes are healthy; the eleventh target, `vercel`, is
intentionally down until its separate token is provisioned and the exporter is
deployed. **46/46 live extension checks passed**, including Access rejection,
private readiness, PromQL parsing, both application and standalone MCP OTLP
paths, exact synthetic API/MCP rates and p95 latencies, organization/user
filters, and absence of private content. These fixtures are isolated in
`validation`, not evidence of real production application coverage.

Local authenticated Vercel investigation queried all **107 available system
metrics through 26 successful compatible queries**, including four bounded
HTTP/cache/runtime breakdowns. The latest check returned 241 numeric samples
and passed pinned Prometheus `promtool check metrics` without lint issues.
The exporter uses one native-unit gauge family with snake-case labels; metric
IDs and units stay explicit labels. Null/empty values remain absent, not zero.
After the review fixes, local regression suites passed: 240 AI, 39 API,
360 dashboard and 41 monitoring tests (680 total), plus relevant typechecks,
changed-source lint and the dashboard production build. The prior standalone MCP
suite passed 97 tests; that checkout was unchanged by this fix round. The final
independent review verified all five original findings and both follow-up gaps,
including 22 targeted network-free tests and installed dependency inspection.
The standalone MCP changes are in the separate `/Users/janburzinski/coding/notra-mcp`
checkout. Neither application repository was committed, pushed or rolled out.

Effective Railway checks use the paths below, timeout 120 seconds and five restart
retries. Each service is configured for one US East replica and no public Railway domains. Blackbox
runs as UID 65534; Grafana as 472 and Loki/collector as 10001. Grafana background
plugin preinstallation is disabled, preserving bundled plugins and preventing
the reproduced optional Elasticsearch permission error. The HTTP-only tunnel's
ICMP proxy permission warning is expected; do not grant extra privileges for it.

| Service | Effective Railway health path | Verified deployment |
| --- | --- | --- |
| Grafana | `/api/health` | `643104e9-ea36-41b1-8241-6e5b707e7f39` |
| Prometheus | `/metrics` | `b5ea7a8a-dbf0-442b-89b9-358909481566` |
| Loki | `/ready` | `707aeb35-b7cf-4592-820a-0937eef24808` |
| Collector | `/` on port 13133 | `8e62a7d2-856e-4c41-b9a4-abbb3eb52918` |
| Blackbox | `/` | `7fa9c612-59c9-4566-b623-446b130791f8` |
| Tunnel | `/ready` | `850beaa1-e490-4367-aaaf-74c107e06ff9` |
| Vercel exporter | `/healthz` | **No deployment; awaiting separate token** |

Railway's service-update API rejects Prometheus's canonical `/-/ready` path.
Its Railway check therefore uses `/metrics` (HTTP process health, not a TSDB
readiness guarantee); the canonical private `/-/ready` endpoint was independently
verified as 200 after deployment and must be checked again after future releases.
Application exporter changes remain source-only: `ai-traffic-ingest` was not
redeployed, and production application telemetry has not been activated.

Set `PORT` to each service's health port. Keep `NOTRA_OTLP_TOKEN` on the collector,
`GF_SECURITY_ADMIN_PASSWORD` / `GF_SECURITY_SECRET_KEY` on Grafana, and
`TUNNEL_TOKEN` on the tunnel **sealed**. Changing the Grafana admin environment
variable does not rotate an existing database password; use Grafana CLI's
`reset-admin-password --password-from-stdin` inside the service.

From the repository root, deploy just the intended monitoring service:

```sh
railway up infra/observability/loki --path-as-root \
  --project 557ca18d-9de8-40ad-9fca-cf3d165f3c44 \
  --environment 276f8b24-ccd7-4bf3-a6b6-1dbe9f7fe5c6 \
  --service loki --detach --json -m "Update Loki configuration"
```

Before uploading, review `railway config plan` against the correct project and
environment; apply settings only with approval of that exact plan. Read back the
effective Railway health, timeout, retry and single-region settings. IaC does not
upload these Docker contexts. Keep `RAILWAY_RUN_UID=65534` for Blackbox and the existing root bootstrap
settings for volume-backed services. Verify that exact deployment reaches `SUCCESS`, then check runtime health; an
initial health check alone does not prove the process remains running. Do not
target `ai-traffic-ingest` when deploying monitoring.

Prometheus retains 30 days, bounded to 4 GB of TSDB blocks (WAL/head add overhead).
Loki retains 14 days on its volume; there is **no independent byte-size cap**.
Check used versus allocated storage in Railway's volume view for Loki,
Prometheus and the Collector queue; the Grafana panels do not measure disk usage.
Retention by time does not prevent Loki filling its volume, and Prometheus's
4 GB block cap excludes WAL/head overhead. This single-replica filesystem stack
is not highly available or a backup strategy. Never delete volumes to redeploy
or upgrade.

## Sanitized historical coverage (2026-10-10)

The four dashboards now separate live US East probes, imported history and pending
application/Vercel collection. Unconnected application panels are collapsed, not
shown as zero. Only Grafana is released for these dashboard changes; application
deployments and Railway settings are unchanged.

The frozen import covers 2026-10-03 11:35:08.391 UTC through
2026-10-10 11:35:08.391 UTC. Axiom contributes 24 numeric daily aggregate records:
55,063 observed completed API requests (two 5xx), 36,657 completed AI calls,
380,681,675 reported tokens, and 498,269 weighted ingest request observations.
All contributing rows had their corresponding status/token/weight measurement.
No Axiom prompts, outputs, request URLs, error text or tool content were read into
the backfill. Axiom totals are team-wide and do not honor a customer-ID filter.
They represent whole UTC-day buckets, with partial first/last days; a narrow
dashboard time picker cannot turn them into precise sub-day totals.

The production database was read inside the existing ingest environment using
one `READ ONLY` transaction, a five-second statement timeout, a one-second lock
timeout, UTC timestamps and a 2,000-scan cap. Its explicit projection includes
188 scans, of which 187 have a valid stored reported usage value. The combined
stored value is approximately $1,173.49, **not cash paid** and not a known
gateway/BYOK split. Missing values remain absent. Scan timestamps are original;
statuses and usage are the database state observed during import, not a
time-travel reconstruction of state at the cutoff. Component checks were not
imported or added to scan totals. Production credentials were not copied into
monitoring, exported, or printed.

[`history/`](history/) contains the bounded replay tools. `backfill-db.ts` defaults
to a dry run and requires an explicit `HISTORY_END`; `import-axiom.ts` reads at
most 24 reviewed numeric aggregates on stdin. Snapshot metadata is validated by
one shared boundary: real UTC dates are normalized to millisecond ISO strings,
and every snapshot must span **exactly seven days**. Shorter windows are rejected,
not merged under the same end-only identity. Seconds-precision dates are accepted
and canonicalized; impossible calendar dates are rejected. Existing seven-day
snapshot IDs and dashboard selectors are unchanged. Daily buckets must overlap
the half-open source window; a bucket starting exactly at the cutoff is excluded.
Only `--apply` writes, exclusively
to private Loki. Snapshot and hourly stream labels bound historical cardinality
and keep exact retries within Loki's one-hour out-of-order allowance; per-record
IDs remain JSON fields, not indexed labels. Queries pin a snapshot and deduplicate
by its stable call/cost IDs, so overlapping snapshots are not added together.
Original timestamps are subject to Loki's seven-day ingestion-age limit and
fourteen-day retention. Imports older than that need a separately reviewed plan.
After this import, private `POST /flush` persisted the historical chunks without
shutting Loki down; old records were not fully queryable before that flush.
Always verify source-matching counts after ingestion rather than trusting HTTP 204.

An exact replay means resending the same sanitized records. Rerunning the database
reader with the same cutoff reads current stored scan status and usage again; it
is not an immutable replay or a reconstruction of state at that cutoff. Retain
the original sanitized projection when an exact replay is required. No polling,
sync, or raw-content archive is introduced by these tools.

**There is no unattended historical sync.** The existing application Axiom token
returns 403 for reads; ongoing Axiom polling requires a separately scoped read
token. Application OTLP rollouts remain unapproved and disabled. Vercel still
requires its dedicated Notra-team token. The hardened second-destination value
validator and contaminated-metadata regressions are source-only until those
application releases; rich Axiom payloads are unchanged.

Grafana deployment `643104e9-ea36-41b1-8241-6e5b707e7f39` reached `SUCCESS`.
All four live dashboard definitions match source. Nineteen bounded live checks
passed, including nine exact source-matching values through Grafana's datasource
query API, datasource health, five probes, ten runnable scrape targets, the
anonymous Access redirect and unauthenticated OTLP rejection.
An exact replay of all 24 Axiom aggregates left all five displayed Axiom totals
unchanged; repeated import does not double-count them. Local targeted
regressions passed 119 tests; native Loki evaluation passed 60 query comparisons
and 16 API/MCP attribution checks. The broader AI suite exceeded its two-minute
timeout and is **not** recorded as passing. Visual, keyboard and narrow-screen
inspection remains unverified because the desktop browser is disconnected.

## Cloudflare configuration

Account: `42c6313caca1b1ca404152304a463d64`.
Zone: `63d7d62676fd651f6556176706df13a3` (`usenotra.com`).
Tunnel: `84b7c1c3-88c4-46a8-8411-340f2acc839e` (`notra-observability`).
Access app: `9b4ced9e-8fd0-4517-8caa-675fd58b7d86`.

Both hostnames are proxied CNAMEs to
`84b7c1c3-88c4-46a8-8411-340f2acc839e.cfargotunnel.com`.
The remote-managed ingress is recorded in `tunnel/ingress.json`; it is not a
local cloudflared config file. Tunnel and admin secrets must never be committed.

## Checks and extensions

```sh
bun test --isolate infra/observability
bunx --no-install tsc --project .railway/tsconfig.json
bunx --no-install tsc --project infra/observability/vercel/tsconfig.json
node infra/observability/validate-config.mjs
node infra/observability/check-queries.mjs
bun test --isolate packages/ai/src/utils/telemetry-event.test.ts \
  packages/ai/src/utils/otlp-pipeline.test.ts \
  packages/ai/src/utils/checkpoint-pipeline.test.ts \
  packages/ai/src/utils/model-call-telemetry.test.ts \
  packages/ai/src/router/router.test.ts \
  packages/ai/src/router/route-usage.test.ts \
  packages/ai/src/router/credits.test.ts
```

`config.test.mjs` checks private/authenticated access, dashboard customer filters,
missing-data semantics and equality with the original metric queries after removing
only their projection/retention stage. Focused AI tests cover content-free projection,
GEO producer codes and transport isolation.

The Vercel exporter uses dependency-free, erasable TypeScript executed directly
by its pinned Node 24 image. CI checks its strict provider boundary and internal
contracts separately. The code-quality review on 2026-10-10 removed name-derived
event grouping and consolidated query status emission. A fresh local read-only
poll covered all 107 catalog metrics with **22/22 successful queries** (previously
26), returned 127 numeric samples, and passed pinned `promtool check metrics`.
Its non-root Docker health/metrics/404 checks passed as well. These checks do not
activate permanent collection or replace the still-required separate team token.

`grafana/query-fixtures.json` is the native-query fixture contract: raw timestamp-
relative streams, original full-JSON baseline queries, dashboard UID/panel/target
references, environment/org selections and known deduplicated accounting/runtime
values. It includes malformed JSON, missing/invalid numerics, unrelated events,
escaped event keys, nested AI fields, multiple organizations and repeated cost IDs.
Both fixture files now state exact expected panel vectors and selections using
the same contract. One assertion loop runs 24 exact checks across 17 accounting,
runtime and API/MCP targets independently of the 36 baseline/current comparisons; it does
not recompute expectations from fixture events or query implementation.
The source tests check this contract, not Loki execution or live deployment.
CI separately runs `validate-config.mjs` with the Dockerfile-pinned Prometheus,
Loki and collector binaries, then `check-queries.mjs` evaluates 36 baseline/current
query comparisons and known cost/runtime values against disposable pinned Loki.
Only fixture data and a loopback ephemeral port are used; its uniquely named
container is removed afterward. Both commands require a running Docker daemon
and fail rather than skip when unavailable. Before the fixture trim, all three native
config validators, 60 native query comparisons and explicit cost/runtime expectations
passed locally on 2026-10-10. The trimmed fixtures passed source tests but have not
been rerun against native Loki. Local Grafana provisioning and non-root Blackbox checks
also passed before the trim.
The CI steps are wired in source but have not run remotely (nothing was pushed).

Security checks: anonymous or forged-identity Grafana requests must redirect to
Access; OTLP without a valid token must return 401; telemetry `/`, `/api/health`
and `/v1/traces` must return 404. Valid content-free fixture logs should appear
in Loki under `deployment_environment_name="validation"`. Prometheus `up` and
`probe_success` should both be 1 for their configured targets. Grafana datasource
health endpoints should report `OK`.

Extend the provisioned dashboards in `grafana/dashboards/notra.json` (operations)
and `grafana/dashboards/notra-accounting.json` (on-demand usage accounting); both
are read-only in Grafana and redeploy with source. Add probe URLs in
`prometheus/prometheus.yml`. Add privacy-reviewed event fields in
`packages/ai/src/constants/telemetry.ts` with a regression test. Keep organization,
user and generation IDs out of indexed Loki labels. Use durable counters or a
billing ledger, not log-derived sums, for authoritative accounting.
