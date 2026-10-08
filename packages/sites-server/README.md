# Notra Sites: server side and runbook

Hosted blogs and changelogs built from a customer GitHub repository.

For the current gated, defaults-first rollout and Cloudflare prerequisites, see
[the private-beta release checklist](PRIVATE_BETA.md).

| Piece | Where | Runs on |
| --- | --- | --- |
| Shared contract (schemas, mounts, hosts, state transitions, preview tokens) | `packages/sites-core` | everywhere |
| MDX/JSX validator + transform (never executes customer code) | `packages/sites-compiler` | dashboard + sandbox |
| Build toolchain (Astro theme, `notra-sites` CLI) | `apps/sites-builder` | Upstash Box snapshot |
| Orchestration (outbox, builds, activation, domains, editor) | `packages/sites-server` | dashboard (Vercel Workflow) |
| Static file server | `apps/sites` | Cloudflare Worker |

## Flow

```
GitHub App webhook (push / pull_request / check_run)
  → apps/dashboard/src/app/api/webhooks/github/app (signature, durable delivery claim in site_webhook_deliveries)
  → site_deployments + site_jobs in one transaction (generation allocated under a row lock)
  → siteJobWorkflow → runSiteJob (lease + attempts on the job row)
  → GitHub tarball at the exact SHA → Upstash Box from snapshot, network deny-all, no secrets
  → out.tgz → validated (regular files only, limits) → R2 deployments/{site}/{deployment}/files/**
  → manifest.json written last
  → state.json compare-and-swap (ETag): pointer only moves to a higher generation
  → GitHub check run (annotations on failure)

Visitor → sites worker → hosts/{host}.json → sites/{site}/state.json (re-read every ≤5 s, fail closed)
  → manifest (immutable, cached per isolate) → file from R2 (edge cache keyed by deployment)
```

The cron `/api/cron/sites` (every minute) re-dispatches jobs whose dispatch was lost or whose lease expired. `/api/cron/sites-cleanup` (daily) deletes deployments that are neither live, an open preview, still building, nor in the last 10 production releases.

## R2 layout (private bucket)

```
hosts/{hostname}.json                       { siteId, kind: alias|custom }, created with If-None-Match
sites/{siteId}/state.json                   status, production pointer, previews; CAS on ETag
deployments/{siteId}/{deploymentId}/manifest.json
deployments/{siteId}/{deploymentId}/files/{mount}/...
logs/{siteId}/{deploymentId}.log
```

## Runbook

**Take a site down now (abuse, legal).** Dashboard → site → Settings → Take site offline, or:
`setSiteSuspended(site, true, reason)`. The worker serves 410 within 5 s for every path, cached files included. New builds for the site are refused.

**Bad release.** Deployments tab → Restore an earlier deployment (no rebuild, takes a fresh generation so running builds cannot override it). Only deployments built for the current origin + mounts are offered.

**Builds stuck in `queued`.** Check `site_jobs` for the deployment: `pending` with `dispatched_at` set → the sweep re-dispatches after 2 minutes; `running` with an expired `lease_until` → the sweep re-claims it; `failed` → `last_error`, attempts exhausted (redeploy from the dashboard). Concurrency limits (`SITE_BUILD_LIMITS`) push jobs back by 20 s when the sandbox budget is used up.

**Toolchain change (theme, Astro, compiler).** Rebuild the snapshot and roll the env var:
`cd apps/sites-builder && bun --env-file=../../.env scripts/create-box-snapshot.ts` → set `SITES_BUILDER_SNAPSHOT_ID` (Vercel) → redeploy the dashboard. The deployment records the toolchain `VERSION`.

**Rotate the preview secret.** Generate a new value, set `SITES_PREVIEW_SECRET` (dashboard) and `PREVIEW_SECRET` (worker: `wrangler secret put PREVIEW_SECRET`) together. Existing preview sessions and share links stop working.

**Preview access.** Protected previews open with a Notra login (member session), a share link (7 days) or, if set, the preview password.

- *Member sessions* are signed tokens with `userId` + `issuedAt`, valid 1 h. The host-only cookie lives 7 days so an expired one renews by bouncing through `/sites/preview-access` (no click while the member is signed in). Removing a member, leaving an organization, the WorkOS `organization_membership.deleted` webhook and dashboard sign-out write `revokedSessions[userId]` into `state.json` of every affected site; the worker refuses tokens issued at or before it within 5 s. Losing access also ends the share links that member created; signing out does not. Entries are pruned once every token they cover has expired. Role changes don't matter: every member role may open previews.
- *Password*: the database (`sites.preview_password`) is the source of truth: PBKDF2-SHA256, 100k iterations (the Workers maximum), 16-byte random salt, random `version`, never the password. Every `state.json` write copies it from the database, so a lost or stale state gets it back with the next write; `sites.get` also repairs a mismatch in the background (`syncServingPreviewAccess`). The worker verifies `POST /_notra/auth` and mints a password session carrying `passwordVersion`, so changing or removing the password ends all password sessions within 5 s. Guessing is limited by the `PREVIEW_PASSWORD_LIMITER` rate limit binding (10/min per IP and preview, per Cloudflare location) on top of the PBKDF2 cost.
- *Threat model*: `state.json` is a private R2 object; the worker only serves files below `deployments/*/files/`. Someone with R2 read access gets exactly what a database leak gives: a salted, 100k-iteration PBKDF2 hash per site to attack offline (choose long preview passwords), plus the revocation timestamps. Neither lets them mint sessions: that needs `PREVIEW_SECRET`. The dashboard client only ever sees whether a password is set and when.
- Turning previews off closes all open previews like closed PRs; the next push after turning them on builds again.

**Customer proxy domain stopped verifying.** `Check` in the Domains tab runs the probe (`{origin}{mount}/_notra/probe.txt` must name the site) and shows the exact failing URL. The site keeps serving; only the canonical origin is affected.

**Restore after data loss.** R2 holds only build artifacts; any deployment can be rebuilt from its commit (Redeploy). The database is the source of truth for sites/domains (Neon point-in-time restore). A missing `state.json` makes the worker 404 the site until the next deployment activates.

## Domain Connect (one-click DNS for custom subdomains)

Customers whose DNS provider supports [Domain Connect](https://github.com/Domain-Connect/spec/blob/master/Domain%20Connect%20Spec%20Draft.adoc) (Cloudflare, GoDaddy, IONOS, ...) can let the provider create the subdomain records instead of copying them. Synchronous flow, signed requests only.

- `domains.connect` (oRPC) → `domainConnectForDomain`: TXT `_domainconnect.<zone>` (walking up from the parent of the hostname) → `GET https://<that>/v2/<zone>/settings` → `GET <urlAPI>/v2/domainTemplates/providers/usenotra.com/services/sites` (requires version 2 and all three expected records) → signed apply URL. The application returns `unavailable` for proxy/active domains, `unsupported` when configuration, ownership records, or the complete provider template are missing, and `ready` only for a supported complete setup.
- Template version 2: [`domain-connect/usenotra.com.sites.json`](domain-connect/usenotra.com.sites.json). It configures CNAME `@` → `cname.notra.site`, TXT `_cf-custom-hostname` → `%ownership%` (Cloudflare), and TXT `_notra` → `%notraOwnership%` (Notra's public, site-and-hostname-bound challenge). Both TXT values are included in the signed apply payload. Providers must serve the version-2 template with all three records; older or incomplete templates fall back to manual setup instead of offering a partial automatic configuration. Certificates validate over HTTP once the CNAME resolves; the Notra TXT is still required to prove which tenant owns the hostname.
- Signature: RSA-SHA256 (PKCS#1 v1.5) over the exact query string we send (params sorted, `encodeURIComponent`), then `&key=<keyHost>&sig=<base64, url-encoded>`; `sig` must be last for Cloudflare.
- Callback: the provider redirects to `/sites/domain-connect/<token>` (HMAC with `SITES_PREVIEW_SECRET` under its own label, 2 h, carries site + domain id; in the path because Cloudflare ignores `state`). The route re-runs the domain check and redirects to `/<org>/sites/<site>/domains?domainConnect=success|cancelled|error`.

**One-time setup**

1. Keys: `cd packages/sites-server && bun scripts/domain-connect-keys.ts`. Put the PKCS#8 key into `SITES_DOMAIN_CONNECT_PRIVATE_KEY` (Vercel, dashboard project; the single-line `\n` form works) and publish the printed records as separate TXT records named `_dck1.domainconnect.usenotra.com`. Verify: `bun --env-file=../../.env scripts/domain-connect-keys.ts --check`.
2. Template PR to [Domain-Connect/Templates](https://github.com/Domain-Connect/Templates): submit the version-2 JSON file (filename `usenotra.com.sites.json`, repo root). Before opening it run `dc-template-linter -merge-or-fail`, `-tolerate warn`, `-cloudflare` and `-logos`, test it in the [online editor](https://domainconnect.paulonet.eu/dc/free/templateedit) and link the result in the PR. The PR description must justify the bare `%ownership%` value: Cloudflare for SaaS prescribes the full TXT value (a UUID) and it cannot carry a prefix. The separate `%notraOwnership%` value carries Notra's versioned public challenge. Register this updated template with each provider; this repository change does not publish it or alter live DNS. Until registration is complete, the application requires manual setup. Candidates without their own Cloudflare resource must first configure the displayed Notra TXT and CNAME, then refresh and configure any additional Cloudflare validation records.
3. Cloudflare onboarding (after the PR is merged): email `domain-connect@cloudflare.com` with the GitHub link to the template, the public key domain `_dck1.domainconnect.usenotra.com`, an SVG logo, the proxy preference **DNS only (not proxied)** for the CNAME (the hostname must resolve to our Cloudflare for SaaS zone so HTTP certificate validation works), and optionally a Cloudflare account ID to test with before they publish it.
4. GoDaddy, IONOS and others onboard templates from the same repository on their own schedule; nothing to send. A provider is ready when the support check above returns 2xx.

**Rotate the key.** Generate a new pair with `--key-host _dck2`, publish the new TXT records next to the old ones, then switch `SITES_DOMAIN_CONNECT_PRIVATE_KEY` + `SITES_DOMAIN_CONNECT_KEY_HOST=_dck2`. Remove `_dck1` once no apply link older than a few hours is in flight.

**Changing the CNAME target or records** needs a template version bump, a new PR and (for Cloudflare) waiting for their automation to pick it up (up to 8 h). Until then the code must keep sending the old variables.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `SITES_R2_ACCOUNT_ID`, `SITES_R2_ACCESS_KEY_ID`, `SITES_R2_SECRET_ACCESS_KEY`, `SITES_R2_BUCKET` | dashboard | R2 token scoped to the sites bucket (Object Read & Write) |
| `SITES_HOSTING_DOMAIN` | dashboard + worker (`HOSTING_DOMAIN`) | domain for `{slug}.` aliases and `{preview}--{slug}.` previews |
| `SITES_PREVIEW_SECRET` | dashboard + worker (`PREVIEW_SECRET`) | HMAC for preview tokens |
| `SITES_BUILDER_SNAPSHOT_ID` | dashboard | Upstash Box toolchain snapshot |
| `UPSTASH_BOX_API_KEY` | dashboard | sandbox builds |
| `CLOUDFLARE_SAAS_ZONE_ID`, `CLOUDFLARE_SAAS_API_TOKEN`, `SITES_CNAME_TARGET` | dashboard | custom subdomains (Cloudflare for SaaS) |
| `SITES_DOMAIN_CONNECT_PRIVATE_KEY` (+ optional `SITES_DOMAIN_CONNECT_KEY_HOST` `_dck1`, `SITES_DOMAIN_CONNECT_PROVIDER_ID` `usenotra.com`, `SITES_DOMAIN_CONNECT_SERVICE_ID` `sites`) | dashboard | one-click DNS via Domain Connect; unset = feature off |
| `SITES_HOSTING_PROTOCOL`, `SITES_HOSTING_PORT` | dashboard, local dev only | `http` + `8787` for `wrangler dev` on `*.sites.localhost` |
| GitHub App | | events `push`, `pull_request`, `check_run`; permissions contents write, pull requests write, checks write |

## Local development

```bash
cd apps/sites && npx wrangler dev --env dev        # worker on :8787, real dev bucket
# dashboard with SITES_HOSTING_DOMAIN=sites.localhost SITES_HOSTING_PROTOCOL=http SITES_HOSTING_PORT=8787
open http://{slug}.sites.localhost:8787/blog
cd apps/sites-builder && bun compiler/cli.ts dev --source <site repo>   # theme dev with live reload
```
