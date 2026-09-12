# Contributing to Notra

Thanks for wanting to contribute to Notra. This guide shows how to set up locally and what we expect in PRs.

## Tech Stack

Notra is a Bun + Turborepo monorepo.

- Runtime and package manager: **Bun**
- Monorepo orchestration: **Turbo**
- Frontend: **Next.js 16**, **React 19**, **Tailwind CSS 4**
- API: **Hono** on **Cloudflare Workers**
- Database: **Postgres (Neon or PlanetScale Postgres recommended)** with **Drizzle ORM / drizzle-kit**
- Auth: **better-auth**
- Queueing and rate limiting: **Upstash (QStash/Redis)**
- API Keys: **Unkey**

## Repository Structure

```text
/
|- apps/
|  |- api/         # Hono API (Cloudflare Worker)
|  |- dashboard/   # Main Notra product app (Next.js)
|  |- docs/        # Product docs (Mintlify)
|  |- web/         # Public marketing site (Next.js)
|- packages/
|  |- db/                  # Shared Drizzle schema and DB helpers
|  |- email/               # Shared email templates/components
|  |- typescript-config/   # Shared TypeScript configs
|  |- ui/                  # Shared UI components
|- package.json
|- turbo.json
```

## Prerequisites

Install or prepare:

- **Bun** `>= 1.3`
- **Node.js** `>= 24` (used by some tooling)
- A **Postgres** database (Neon or PlanetScale Postgres recommended)
- **GitHub** and/or **Google** OAuth app credentials
- Optional but commonly needed integrations:
  - Upstash Redis
  - Upstash QStash
  - Cloudflare R2
  - Resend
  - Unkey

## Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/notra.git
cd notra
git remote add upstream https://github.com/usenotra/notra.git
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Fill in the required values in `.env`:

- `DATABASE_URL`
- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (auth is WorkOS AuthKit)
- OAuth provider credentials
- Any provider keys needed for the area you're working on

Helpful provider docs:

- WorkOS AuthKit: https://workos.com/docs/authkit
- Neon: https://neon.com
- PlanetScale (if using PlanetScale Postgres): https://planetscale.com
- Upstash (Redis/QStash): https://upstash.com
- Unkey: https://unkey.com
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Resend: https://resend.com

5. Run database migrations:

```bash
bun run db:migrate
```

6. Start development:

```bash
bun dev
```

Run a single app when needed:

```bash
bun dev --filter=dashboard
bun dev --filter=api
bun dev --filter=web
bun dev --filter=docs
```

## QStash Local Workflows

If you're testing webhooks or workflows with QStash, set `NEXT_PUBLIC_APP_URL` to a public URL. `localhost` will not work for external callbacks.

Use Cloudflare Tunnel (`cloudflared`) to expose your local app:

- Install `cloudflared`:

macOS

```bash
brew install cloudflared
```

Windows (PowerShell)

```powershell
winget install --id Cloudflare.cloudflared
```

- Create and run a local tunnel to your app (for example, dashboard on port 3000):

```bash
cloudflared tunnel --url http://localhost:3000
```

Leave `DEV_AUTH_ENABLED` unset (or `false`) before exposing the app. Local-dev
impersonation only works on loopback and requires both `DEV_AUTH_ENABLED` and
`DEV_AUTH_EMAIL`. A public tunnel must use a live WorkOS API key so visitors
are not signed in as a database user.

- Copy the HTTPS tunnel URL and set:

```bash
NEXT_PUBLIC_APP_URL=https://your-public-tunnel-url
```

If you need a stable or custom URL, use a locally managed tunnel setup from the official docs:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/

## Build performance

The web and dashboard apps enable incremental TypeScript checking in their
`tsconfig.json` files, overriding the shared base config. Keep this enabled:
Next.js writes the build's type-check state to `.next/cache/.tsbuildinfo`, which
Vercel restores on subsequent builds. A cold build still checks the whole project;
warm builds reuse unchanged checks without disabling type errors.

Next.js 16.3 also enables the Turbopack filesystem build cache by default. Keep
`.next/cache` in Vercel's build cache, but exclude it and `.next/dev` from Turbo's
task outputs. Turbo caches completed build artifacts; Vercel's build cache keeps
the incremental compiler state used when a task needs to run again.

When comparing deployments, measure compilation, TypeScript, static generation,
and output deployment separately. Vercel's `Creating build cache` phase occurs
after `Deployment completed`; it is not additional time until the app is live.
Both projects use filtered Turbo build commands and skip unaffected projects.
Preserve those settings when changing the Vercel configuration.

Standalone `check-types` scripts that run `tsc` enable incremental checking with
command-line flags and write to `.cache/typecheck.tsbuildinfo` within each
package. Run them through `bun run check-types` (optionally with `--filter`) to
reuse this state. These flags override the shared base config for type checks
without changing Eve or tsup builds. The files are already ignored by Git's
`*.tsbuildinfo` rule and are declared as Turbo task outputs.

The code-quality workflow restores these files using a cache key scoped to the
runner platform, dependencies, configuration, and commit. A matching prefix can
restore state from an earlier commit; TypeScript still checks changed source and
its affected dependents. The workflow retains its existing package selection.
Blume's `ui` app uses its own checker and does not produce this cache file.
Next.js production builds continue to use their separate `.next/cache` state.

## Database Workflow

Common Drizzle commands from the repo root:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

Seed helpers:

```bash
bun run db:seed
```

## Making Changes

1. Create a branch:

```bash
git checkout -b feat/short-description
```

2. Run quality checks before you commit:

```bash
bun run format
bun run check
bun run check-types
bun run build
```

3. Commit with clear [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) messages:

```bash
git commit -m "feat(dashboard): add integration activity filters"
```

## Landing Page Copy Sync

If you update landing page copy in `apps/web/src/app/page.tsx`, also update the markdown version in `apps/web/src/app/markdown/route.ts`.

We keep both in sync so the website and markdown endpoint (`/markdown`) say the same thing.

## Pull Request Guidelines

- Explain the problem and why this change is needed.
- Keep PRs focused and reasonably small.
- Link related issues when applicable.
- Include screenshots or recordings for UI changes.
- Update docs when behavior, APIs, or setup steps change.
- Make sure checks pass before requesting review.

## Code Style

- Follow existing patterns in the touched area.
- Use Ultracite's Oxlint and Oxfmt provider via the repository scripts.
- Prefer readable, self-documenting code.
- Add comments only when logic is not obvious.

## Reporting Bugs and Requesting Features

- Use GitHub Issues.
- Search existing issues first to avoid duplicates.
- Include clear reproduction steps, expected behavior, and actual behavior.

## Need Help?

Open an issue or start a discussion in the repo.

Thanks for helping improve Notra.

## Vercel build selection

Keep Vercel's **Skip unaffected projects** setting enabled for all five deployed
apps (`web`, `dashboard`, `agent`, `onboarding-agent`, and `ui`). Vercel uses the
workspace dependency graph to skip projects whose source and dependencies have
not changed. Each workspace must have a unique package name and explicitly
declare its internal dependencies in `package.json`.

The app configs do not set an `ignoreCommand`; build selection relies on
[Vercel's built-in skipping](https://vercel.com/docs/monorepos#skipping-unaffected-projects)
instead of the deprecated `turbo-ignore` secondary check. Keep the project's
Ignored Build Step setting at its default so it does not run an old custom
command after the repository override is removed.

Changes outside the workspace definitions, such as root documentation, can
trigger deployments for all apps. Built-in skipping may also select builds that
the previous secondary check skipped for unrelated Bun lockfile changes.

Root install configuration and the prepare script remain declared in
`turbo.json#globalDependencies` for build cache invalidation. Declare any new
shared build inputs there too.

## Automated tests

Run the complete suite from the repository root:

```bash
bun run test
```

This runs tests in `@notra/ai`, `@notra/geo-core`, and `dashboard`. To focus on
one area, use `bun run test --filter=@notra/geo-core` (or `--filter=dashboard`,
`--filter=@notra/ai`). Use `bun run test --force` to bypass Turbo's test cache.
The **Tests** GitHub Actions job runs the suite and typechecks these packages
on every push and pull request with a frozen lockfile. No database server, `.env`, API keys, or paid model
calls are required by these tests.

Coverage includes:

- **GEO cron and scan persistence:** real Drizzle queries against an isolated
  in-memory PGlite Postgres instance. DDL is generated from the production
  tables, including indexes and foreign keys. Tests cover due/disabled/busy
  projects, overlapping triggers, sweep limits, claim renewal, stale workers,
  abandoned scans, hand-off failures, tenant ownership, and finalization.
- **Cron HTTP contract:** authorization, missing secrets, response counters,
  propagated failures, and registration in `vercel.json`.
- **Scan workflow orchestration:** task/sequence batches, renewed claim tokens,
  accumulated results, partial failures, and the single no-results retry.
- **GitHub polling:** [Vercel Labs Emulate](https://github.com/vercel-labs/emulate)
  starts a local stateful GitHub API. Tests use Octokit over HTTP and create
  releases through the API. Repository discovery and credential lookup are
  test doubles; API responses and signal conversion run for real. Drafts,
  prereleases, lookback windows, missing repositories, and deduplication keys
  are covered.
- **Content schedule timing:** delayed deliveries, UTC scheduling, leap dates,
  month boundaries, and daylight-saving transitions.

Tests under `tests/` run separately from `src/` in the dashboard and AI package
because Bun's `mock.module` replacements live for the entire test process.
Keep infrastructure replacements at the boundary; do not mock the function
being tested. Reset database/emulator state between scenarios and close servers
in teardown. Import only `bun-types/test` in TypeScript configuration so Bun's
global `fetch` extensions do not change the Node/Next application types.

These are not deployed end-to-end tests. PGlite serializes database requests,
so overlapping-call tests do not reproduce separate Postgres connections.
Workflow orchestration tests replace steps and `sleep`; they do not verify
Vercel's durable runtime, restart recovery, or actual cron delivery. Live model
answers, billing providers, and the committed database migration chain are also
outside this suite.
