# Sites private-beta release

This is a deployment runbook, not evidence that the beta has been deployed.

## Application and security gates

Databuddy flag `sites`, targeted by `organizationId`, gates management navigation,
command-palette/AI discovery, dashboard URLs and all Sites RPCs. Missing flags,
errors, timeout and demo mode fail closed. Published sites and cleanup jobs remain
independent of that flag.

Defaults-first creation snapshots normalized configuration in the deployment
target. The builder uses it only when `blog.json` is absent; valid repository
config wins and malformed/unreadable existing config remains an error. Empty
blog/changelog pages use the native header/footer. Editor reads expose virtual
defaults without repository writes or drafts until an actual edit is saved.
Publishing remains explicit and respects branch protection/conflict checks.
Starter PRs are optional for custom brand/chrome files.

Rebuild the Box toolchain snapshot for this release: older builders do not
understand the default-config request. Keep migrations append-only; this JSON
target extension does not require rewriting migration history.

The release includes authoritative disabled-preview checks at enqueue/activation,
a locked current policy through serving-state writes, organization-scoped daily
budget serialization, early source-budget rejection and streaming output caps.
Local synthetic concurrency and request probes are prerequisites, not a guarantee
of live Cloudflare edge policy.

## Infrastructure inspected read-only

The authorized Wrangler login showed `notra-sites-dev` and its dev R2 bucket;
the production `notra-sites` worker was not present. Dev worker secret names
include `PREVIEW_SECRET` and `DEV_HOST_OVERRIDE_TOKEN`. Secret values were not
read or printed. Local environment files lacked Sites/SaaS/runtime variables;
the hosted dashboard environment was not inspected, so recheck it separately.
No production resources or traffic were changed.

## Cloudflare for SaaS

Use a dedicated hosting zone, separate from the dashboard origin. The checked-in
configuration targets `notra.site`; confirm account/zone ownership and inventory
existing routes before publishing. Production's zone-scoped `*/*` Worker route
receives vanity-domain traffic as well as aliases; dev explicitly has no routes.

1. Enable Cloudflare for SaaS on that zone.
2. Configure a fallback origin with an originless, proxied DNS record; Cloudflare
   documents AAAA `100::` when a Worker is the origin.
3. Route `*/*` on the zone to the Sites Worker. Add more-specific exclusions for
   any zone-owned hosts that must not go through Sites. `*.notra.site/*` alone
   does not match unrelated customer vanity hostnames.
4. Align `SITES_CNAME_TARGET`, the DNS record and the optional Domain Connect
   template (`cname.notra.site` in the current template).
5. Give the dashboard a server-only SaaS API token scoped to the intended zone.
   Verify custom-hostname ownership, certificate state and verified host publication
   with a disposable domain before widening access.
6. Keep manual DNS available. Domain Connect signing keys, template publication
   and provider onboarding are separate optional prerequisites.

Custom subdomains also require a public `_notra.<hostname>` TXT record, displayed
with the CNAME and any Cloudflare validation records. Its value binds the site ID
and normalized hostname using `SITES_PREVIEW_SECRET`; keep that secret stable.
Adding a hostname cannot delete another site's Cloudflare resource. Replacement
requires this site's TXT proof, no active competing domain, and matching provider
ownership/TLS verification before host routing changes.

Register the checked-in Domain Connect template version 2 with each supported
provider before enabling one-click DNS for that provider. It includes both
`ownership` (Cloudflare) and `notraOwnership` (Notra) TXT values. An older or partial
provider template is rejected and falls back to manual records; checking a 2xx
response alone is insufficient. This code change does not publish the template.
When a candidate has no Cloudflare ID because another site still owns the
resource, first add the displayed Notra TXT and CNAME manually (or through Vercel
DNS), then refresh to provision its own resource. Add any newly displayed
Cloudflare validation records afterward. Vercel DNS consumes all displayed
verification records, including the Notra TXT.

Existing custom subdomains must also add their displayed Notra TXT record before
re-verification. Missing TXT, DNS errors, or a temporary certificate failure do
not release the existing routing record or silently change the old site's public
origin. Refresh commits the exact candidate's new provider ID and the replaced
claim's stale-ID invalidation before checking provider status or activating R2.
Later GET/R2 failures retain that binding and can be retried with normal TXT and
TLS verification. The short binding transaction uses one lazy connection pool
to the same database, capped at one additional connection per application
runtime, so primary-pool admission waiters cannot starve the binding commit.
Account for this connection in database capacity planning.

ADD inserts its pending candidate before creating a provider resource and fills
its ID and validation records in the same call. Insert failure therefore creates
no provider resource. A known binding/callback failure compensates only a newly
created, unreferenced resource. If creation succeeds but the API response is lost,
or a commit/cleanup outcome cannot be established, automatic deletion is unsafe.
Refresh refuses unknown resource IDs; an approved operator must reconcile the
candidate and provider inventory before retrying. Single-site deletion uses the
same organization-first, sorted-host admission as workspace deletion, so an
admitted ADD must finish before deletion captures its provider IDs.

Reference: [Workers as your fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/).

## Release sequence

Run `bun scripts/sites-private-beta-preflight.ts` in the intended dashboard
deployment environment. It prints variable names/status, never values. It cannot
certify remote permissions, edge settings or matching worker/dashboard secrets.

1. Apply the consolidated `0112_sites.sql` after main's migrations through `0111`;
   it includes visitor tracking and tenant-integrity changes. Do not replay it
   on a database that already applied the former 0109–0111 sequence; reconcile
   that development migration history separately. Deploy the updated Tinybird
   `geo_traffic_overview` and `web_audience` pipes.
2. Create a private production R2 bucket. Match its account/name to Worker
   `SITES_BUCKET` and scope dashboard credentials to required object operations.
3. Build/upload the current Box snapshot and configure `SITES_BUILDER_SNAPSHOT_ID`.
4. Configure dashboard Sites, Redis, QStash, signing keys and cron authentication.
   Verify job delivery/retry, the minute redispatch cron and daily cleanup cron.
5. Securely set worker `PREVIEW_SECRET` to the same strong secret as dashboard
   `SITES_PREVIEW_SECRET`. Secret-list output proves names only, not equality.
6. Deploy the worker with the R2 and `PREVIEW_PASSWORD_LIMITER` bindings. Confirm
   production has no `DEV_HOST_OVERRIDE_TOKEN`; never copy localhost/dev settings.
7. Verify aliases, preview aliases, custom DNS/TLS and Worker routing. Protected
   responses must never be externally cached ahead of the worker auth fence.
8. Validate browser cookie/Origin isolation between sibling tenants; review Public
   Suffix List handling of the hosting domain before broadening the beta.
9. Enable the `sites` flag for one internal organization, not globally.

Safe packaging checks:

```bash
bun run test -- --force
bun run check-types -- --filter=dashboard --filter=api --filter=@notra/sites-core --filter=@notra/sites-server --filter=@notra/sites-compiler --filter=@notra/sites-builder --force
bun run check
bun run build -- --filter=dashboard --filter=api --force
cd apps/sites && bun run build
```

The Worker build is a dry-run. Apply real cloud changes only after confirming the
intended account, zone, bucket and runtime settings. For top-level production use
an explicit Wrangler `--env ""`; use `--env dev` only for the development worker.

## Smoke test and recovery

The SQL `activeProductionDeploymentId` is an ingest read projection of the R2
production pointer, not a replacement for R2 serving authority. Ingest uses that
deployment's frozen origin and mounts; queued/failed rebuilds do not move traffic
ownership or suppress SDK traffic on newly requested paths. Sites without a
published projection claim no ingest ownership.

Before switching ingest to this release, reconcile existing R2-live beta sites
whose SQL projection is null. An admin can invoke the existing `sites.update`
mutation with only `{ organizationId, siteId }`: the no-op save records and
dispatches a `sync_state` job without requesting a rebuild. The regular job
sweeper retries failures. Inspect that job's outcome and the scoped site's SQL
projection before enabling ingest.

For an approved operations environment, the same existing service path can be
run explicitly for one known beta site from the repository root:

```bash
SITE_ID=site_replace_with_approved_id bun --env-file=.env -e '
  import { db } from "./packages/db/src/drizzle.ts";
  import { getSite } from "./packages/sites-server/src/deployments.ts";
  import { updateSiteSettings } from "./packages/sites-server/src/sites.ts";
  import { runSiteJob } from "./packages/sites-server/src/runner.ts";
  try {
    const siteId = process.env.SITE_ID;
    if (!siteId) throw new Error("Approved SITE_ID is required");
    const site = await getSite(siteId);
    if (!site) throw new Error("Approved site not found");
    const { syncJobId } = await updateSiteSettings(site, {}, null);
    console.log({ syncJobId, outcome: await runSiteJob(syncJobId) });
  } finally {
    await Reflect.get(db, "$client").end();
  }
'
```

The fenced worker repairs the projection from a fresh, same-site production
pointer in R2, using payload `{ "rebuild": false, "removePreviewsThrough": null,
"requestedByUserId": null }`. Explicit redeployment also establishes it when
activated. Do not backfill from the newest ready deployment or use GET repair.
The v2 ingest cache namespaces ignore old desired-config cache entries; until
reconciled, a null projection intentionally has no ingest ownership.

Exercise a disposable site: no-config setup, empty/default build, virtual config
edit/discard, PR publishing, protected direct-commit refusal, member/password/share
preview access, secret/permission revocation, concurrent preview disable/redeploy,
domain verification/removal, origin-change rebuild, rollback and cleanup. Inspect
job outcomes and serving state, not only dashboard toasts.

To withdraw management, disable the workspace flag; existing sites stay online.
Use the explicit offline action when a site must stop serving. For bad application
code, restore the previous Worker/dashboard release; for bad customer content,
restore an eligible production deployment. Retain private artifacts and DB history
until recovery is verified.
