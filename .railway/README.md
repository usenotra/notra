# Railway monitoring infrastructure

`.railway/railway.ts` describes the **seven monitoring services and four existing
volumes** in `notra-prod / production`. Shared deployment/storage settings live in
`constants/observability.ts`; the SDK is pinned in the root dev dependencies.

The named `observability` partial deliberately limits this adoption to monitoring.
The application's `ai-traffic-ingest` service remains outside IaC ownership. Do
not remove or rename the partial, or import the whole environment over this file.
A whole-project file can delete omitted resources. Expanding ownership requires
an explicit migration and a newly reviewed plan.

## Check and plan

From the repository root:

```sh
bun install --frozen-lockfile
bunx --no-install tsc --project .railway/tsconfig.json
bun test --isolate infra/observability
railway link --project notra-prod --environment production
railway config plan --detailed-exit-code
```

Use Railway CLI **5.63.0 or newer**. The authoring file rejects another project or
environment. `link` only selects local CLI context; `plan` does not apply changes.
Detailed exit codes are 0 for no change, 2 for pending changes, and another nonzero
code for an error. Review every resource and volume change before any apply.

On **2026-10-10**, the live plan reported the configuration already up to date:
no additions, changes or deletions. After user approval, that pinned plan was
applied and Railway ownership was registered for exactly six services and four
volumes under `observability`. The subsequent plan also reported no changes.
All six deployment IDs and four volume IDs remained unchanged; the existing
volumes were `READY`. The application ingest deployment was unchanged and is not
owned by the partial. All 71 post-adoption live checks passed, as did 32 local
infrastructure tests and the IaC typecheck. Always obtain a fresh plan before
subsequent changes.

The subsequently approved extension added only `vercel-metrics` (service
`f06fc2aa-26b6-420a-8077-094555f429ad`), bringing partial ownership to eleven
resources. The saved one-create/no-update/no-delete plan was applied on
2026-10-10 and the follow-up plan reported no changes. Existing volumes and
application services were not changed by this apply. The exporter has no
deployment yet: token creation through the Vercel API returned 403. Provision a
separate 90-day Notra-team token as sealed `VERCEL_MONITORING_TOKEN` before
uploading its Docker context; never deploy the user's CLI authentication token.

## Scope and deployment

- Existing names are adoption identities. Do not rename services or volumes.
- Services remain private, with one US East/Virginia replica configured
  (`us-east4-eqdc4a`), matching the production ingest service. Cloudflare DNS, Access and the
  tunnel's remote ingress remain separately managed, not part of Railway IaC.
  The rendered configuration explicitly empties Railway-generated domains as
  well as custom domains and TCP proxies; `domains: []` alone covers only custom
  domains in the pinned SDK. This source change requires a separately reviewed
  plan before any future apply; no live change is implied.
- Secret variables use `preserve()`: no secrets are stored in source. On a fresh
  project they must be provisioned separately; this file targets existing resources.
- `PORT` and runtime bootstrap users are explicit. Volume-backed services keep
  root initialization before dropping privileges in their Docker entrypoints.
- Volumes retain their imported identities, mounts, 50,000-MB allocations, online-resize
  setting and usage alert thresholds. These are not a backup strategy.
- Build sources remain unset, matching the live services. IaC manages service
  settings; it does **not** upload Docker contexts, deploy app code or enable
  production application telemetry. Continue using the explicit per-service
  `railway up ... --path-as-root` workflow in
  [`infra/observability/README.md`](../infra/observability/README.md).
- Do not add a GitHub source without reviewing the Docker build context and
  deployment triggers. Each Dockerfile currently expects its own directory root.
- The unused monitoring `railway.json` files were replaced, not retained as a
  competing source of configuration. No remote config-file setting was changed.

Never apply from automation or an agent without approval of the exact reviewed
plan. Plan artifacts may contain sensitive state: keep them outside `.railway/`
and outside source control. No deployment or automatic apply workflow is added.

## US East migration

The requested region change was approved and applied on **2026-10-10**, moving
monitoring to `us-east4-eqdc4a`. All six runnable service deployments reached
`SUCCESS`; Vercel remains undeployed pending its separate token. All four active
volume instances are `READY` in US East; logical volume IDs, mounts and 50,000-MB
allocations are unchanged. Railway assigned new underlying volume-instance IDs
during migration. Four pre-migration recovery snapshots were created and listed;
a restoration drill was not performed. Existing Prometheus history and Loki
validation events remain queryable, and all four dashboards match source. All ten
runnable scrape targets and five probes are healthy; Access redirects anonymous
Grafana requests and OTLP rejects unauthenticated requests.

CLI 5.63.4's native IaC plan omitted service replica-region changes and reported
only the four volume-region changes. That incomplete pinned plan was **not
applied**. After explicit approval of the exact seven-service/four-volume patch,
the migration used `railway environment edit --json`, explicitly removing EU
replicas and assigning one US East replica. A complete before/after comparison
confirmed only approved region fields changed, with application config untouched.
The post-migration IaC plan reports no changes; independently verify live region
placement rather than relying on that planner alone. Evidence is kept in protected
`notra-us-east-*` artifacts outside source control.

For future migrations, change all seven
monitoring services and the four existing volumes together, keeping their names,
mounts, secrets, domains and data. Do not recreate or detach volumes, reset data,
or change application services. Railway migrates attached volume data when
changing region, with downtime for the volume-backed service; duration depends
on the stored data and must not be promised in advance.

Before apply, take and verify recovery backups of the four monitoring volumes.
After migration, verify each deployment, volume readiness and US East placement,
Grafana data/dashboards, private Prometheus/Loki/collector health and all probes.
Vercel stays undeployed pending its separate token; migration must not activate
application telemetry or substitute a personal Vercel credential. Probes then
measure availability from US East, not EU. See
<https://docs.railway.com/deployments/regions> for volume migration semantics.
