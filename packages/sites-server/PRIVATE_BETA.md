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

Reference: [Workers as your fallback origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/).

## Release sequence

Run `bun scripts/sites-private-beta-preflight.ts` in the intended dashboard
deployment environment. It prints variable names/status, never values. It cannot
certify remote permissions, edge settings or matching worker/dashboard secrets.

1. Apply forward migration `0110_automatic_visitor_tracking.sql` normally; deploy
   updated Tinybird `geo_traffic_overview` and `web_audience` pipes.
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
