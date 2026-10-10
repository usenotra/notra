# Demo and AI traffic infrastructure

These TypeScript definitions describe **existing** Railway services. They do not
provision a replacement stack, copy secrets, or deploy application code.

| File | Project / environment | Managed resources | Ownership |
| --- | --- | --- | --- |
| `demo.ts` | `notra-demo` / `production` | `demo-api`, `dashboard` | Whole demo environment |
| `ai-traffic.ts` | `notra-prod` / `production` | `ai-traffic-ingest` | Named partial `ai-traffic` |

`notra-prod` already has an `observability` partial. Its services and volumes are
not declared here and must remain with that owner. Do not remove the `ai-traffic`
partial export, rename it after adoption, or import the whole production project
into this file. A named partial only deletes omitted resources it owns; a whole
project definition can delete omitted resources across the environment.

## What stays the same

- Existing service names bind to existing Railway resources. No database, Redis
  instance, bucket, or volume is created. Existing database, Upstash, Tinybird, and
  other integrations continue through their existing variables.
- All imported variables use `preserve()`, including non-secret values. This
  retains their values and references in Railway; it cannot initialize a new
  environment. Do not use `config pull --include-variables` or commit plan
  artifacts containing values.
- The GitHub repository stays connected. Each source explicitly uses
  `branch: null`: `github()` otherwise defaults to `main`. Omitting `source`
  altogether proposes removing the connection with CLI 5.63.4. The demo API and
  ingest retain `rootDirectory: "/"`; the dashboard retains its existing empty
  root, also the monorepo root. Do not set an app subdirectory as the build root.
- Current Dockerfile paths, custom domains, healthchecks, replica placement,
  ingest draining/retry settings, and dashboard pre-deploy migration are retained.
  Ingest has **two** Virginia replicas; each demo service has one.
- No GitHub deployment branch or watch patterns are restored. Application releases
  still run through `scripts/github/production-deploy.mjs` after Vercel succeeds,
  using the checked release commit. IaC is not read during application builds.

## Check locally (no Railway credentials needed)

Use the repository's Bun and Node versions, install with `bun install`, then:

```sh
bun run railway:check
```

This typechecks both definitions and runs the ownership, secret-preservation,
source, and wrong-context regression checks. The root `bun run test` runs this
check too, so existing code-quality CI covers it without infrastructure
credentials. The `railway` SDK is pinned to 3.12.0, compatible with the repository's
seven-day dependency release-age policy. Use Railway CLI 5.63.4 or newer for the
live workflow.

## Preview against the existing infrastructure

Run from the repository root. Linking changes only the CLI's local context, not
the infrastructure. Both definitions reject the wrong project or any environment
other than `production`.

```sh
railway link --workspace Notra --project notra-demo --environment production
railway config plan --file .railway/demo.ts --detailed-exit-code

railway link --workspace Notra --project notra-prod --environment production
railway config partials list
railway config plan --file .railway/ai-traffic.ts --detailed-exit-code
```

Always pass `--file`; there is deliberately no default `.railway/railway.ts`
because these definitions target different projects. Exit code `0` means no
changes, `2` means drift, and other non-zero codes mean errors. An initial import
must produce **zero additions, changes, and deletions**. Stop if the plan proposes
replacing a service, changing variables, removing a repository, restoring a branch,
or touching observability resources.

For a read-only snapshot when updating a definition, link to the correct project
and run `railway config pull --json`. Keep only the intended resources and retain
the ownership boundary. Review a fresh plan after every edit. Avoid a plain
`config pull` from this directory: it generates a default whole-project file.

## Adoption is a separate, explicitly approved step

Committing or merging these files **does not apply** them. This change adds no
apply workflow and has not claimed ownership of the ingest service remotely.

After reviewing a fresh no-change plan, an operator can adopt one definition with
interactive `railway config apply --file .railway/demo.ts` or
`railway config apply --file .railway/ai-traffic.ts`, using the matching link above.
The first ingest apply records `ai-traffic` ownership even with no config changes.
Verify ownership with `railway config partials list` afterward.

Future changes can trigger redeployments. Coordinate any apply with the existing
production release window; do not add an independent apply-on-merge job. If CI
automation is added later, use a separately scoped token for each environment,
read-only PR plans, and reviewed pinned plans (`config plan --out`, followed by
`config apply --plan`). Keep potentially secret-bearing plan artifacts outside
`.railway/`, private, and out of Git. Never auto-confirm destructive changes.

Reference: [Railway Infrastructure as Code](https://docs.railway.com/infrastructure-as-code).
