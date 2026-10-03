# Dashboard migration: isolated tests and comparable measurements

## Current dashboard runtime and cleanup verification

The dashboard uses TanStack Start, Vite, and Nitro. From the repository root,
run `bun run dev --filter=dashboard` for the loopback-only Vite server on port
3000 and `bun run build --filter=dashboard` for the production artifact. From
`apps/dashboard`, `bun run start` serves `.output/server/index.mjs` and
`bun run check-types` checks types separately from the Vite build.

After removing dashboard compatibility imports, Next-specific dependencies,
configuration, and dead page entry points, rerun the automated checks and
real-server smoke checks below with fresh artifacts. Previously recorded
migration results do not establish cleanup verification. `NEXT_PUBLIC_*`
deployment variable names and `next-themes` remain intentionally supported.
Next.js commands below describe the preserved historical baseline, not the
current dashboard build; keep that baseline isolated from the migrated checkout.

## Real-server parity smoke coverage

The expanded verification pass is recorded in [migration-status.md](./migration-status.md), with fresh local evidence under `.hoplite/verification-complete/`. Normal-motion production browser checks now pass using the WebGL fallback. Development browser coverage includes content, skills, and the populated settings modal. The opt-in real-data suite runs with `bun apps/dashboard/tests/migration/data-smoke.mjs http://127.0.0.1:3000 <new-output.json>` against the development fixture preview. It validates the dedicated database and synthetic identity, creates temporary drafts, verifies real mutations and tenant/method boundaries, then cleans up only its exact fixture IDs. It does not use provider credentials.

`bun run test` also includes `tests/workflow-runtime.test.ts`, which builds a small provider-free fixture using the actual dashboard Workflow plugin and verifies serialization, persistence, forced process termination, restart, and hook resumption. This local runtime check does not establish hosted Vercel queue behavior. Run heavy builds, the development browser suite, and the complete automated suite sequentially to avoid the observed development-server and subprocess timeouts; do not relax assertions to hide them.

Source-level checks can run while application startup is blocked: `security-contracts.test.ts` executes the real healthcheck through the real method dispatcher, redirect sanitization, session CORS, public-route classification, development-auth guards, and locale negotiation without module mocks. `route-wiring.test.ts` checks generated API/auth entries against existing original handler files, catch-all adaptation, and the router's generated-plus-UI composition. These source contracts detect registration mistakes but cannot prove runtime matching, SSR/provider wiring, or hydration. The existing `src/lib/auth/route-handler.test.ts` additionally exercises streaming response identity, cookies, signed-body preservation, and dynamic params. No source test requires a working Workflow runtime or external credentials.

`tests/migration/http-smoke.mjs` and `tests/migration/browser-smoke.mjs` exercise the running application, not mocked route modules. They are explicit opt-in commands, not automatically run by `bun test`. Run from the repository root against a separately started loopback server with the sanitized local environment. They do not build or start the app, submit login credentials, or invoke integrations. Use a fresh artifact directory/output filename for every run. Screenshots and JSON are local evidence for inspection, not automatically publishable proof.

Production anonymous profile:

```sh
node apps/dashboard/tests/migration/http-smoke.mjs http://127.0.0.1:3000 .hoplite/artifacts/parity-production-http.json
PLAYWRIGHT_BROWSERS_PATH="$PWD/.hoplite/playwright/browsers" \
  node apps/dashboard/tests/migration/browser-smoke.mjs \
  http://127.0.0.1:3000 production-anonymous .hoplite/artifacts/parity-production-browser
```

The HTTP suite requires healthcheck/static assets to return 200, unsigned geo cron to return 401, real oRPC `user/organizations/listOwned` POST to return 401, and session OPTIONS to enforce allowed/disallowed CORS origins. The browser suite checks English/German login rendering, locale-cookie precedence, anonymous protected-page redirection with returnTo, anonymous session data, and uncaught browser errors. It never submits a login or follows an external identity-provider navigation. Browser interception blocks external origins and records them; it does not substitute application responses. Server-side egress is not intercepted: keep all external credentials absent/placeholders and audit startup configuration separately.

Development-only fixture profile requires a separate development server bound to `127.0.0.1`, `NODE_ENV=development`, `DEV_AUTH_ENABLED=true`, and `DEV_AUTH_EMAIL=migration-owner@example.invalid`. Do not enable this identity in production or on a public listener. Use the same dedicated local database, no live WorkOS key, no provider credentials, and English locale.

```sh
PGPASSWORD=notra_test psql -h 127.0.0.1 -U notra_test -d notra_migration_test \
  -v ON_ERROR_STOP=1 -f apps/dashboard/tests/migration/fixtures/seed.sql
PLAYWRIGHT_BROWSERS_PATH="$PWD/.hoplite/playwright/browsers" \
  node apps/dashboard/tests/migration/browser-smoke.mjs \
  http://127.0.0.1:3000 development-fixture .hoplite/artifacts/parity-development-browser
```

The seed checks database and role before mutation and inserts two deterministic synthetic users, two organizations, and one owner membership per organization. It contains no production data, WorkOS IDs, sessions, integration tokens, subscriptions, or billing overrides. Reapplying leaves existing rows intact. The seeded owner can access `migration-test` but not `migration-other`. The seed has been applied and reapplied successfully to the isolated database.

The development suite verifies the actual seeded session identity, direct Framer navigation as a full page, soft Framer navigation as a dialog without document replacement, Escape/back restoration, cross-tenant denial, and rejection of development identity with a public forwarded IP. Before the soft-navigation click, it waits for the matching anchor's own `__reactProps*` property to contain an `onClick` function, so a visible SSR link is not clicked before hydration. This is a test-only, private React implementation heuristic, not a public readiness API or proof of complete application hydration; reassess it when upgrading React. The same-document and dialog assertions still establish the actual navigation behavior. Missing billing entitlements, provider initialization, loaders, or selector mismatches are failures to investigate, not permission to stub the app or weaken authorization assertions. This minimal fixture does not seed content/projects or claim mutation/streaming parity.

The forwarded-public-IP check requires HTTP 403 and verifies that the response text contains neither the fixture user ID nor email. Its earlier expectation of HTTP 200 with a null session was incorrect: the original Next `src/proxy.ts` explicitly returned 403 for a blocked local-development gate, and the migrated middleware tests preserve that contract. This correction changes only the smoke expectation, not authentication behavior.

Playwright 1.58.2 and Chromium 145.0.7632.6 are installed in `.hoplite/playwright`, and headless Chromium launch was verified. For a fresh workspace, create `.hoplite/playwright/package.json` first with a private package name and exact `playwright` dependency, then run `mise exec bun@1.4.0 -- bun install --ignore-scripts` **inside that directory**. An empty directory is insufficient: Bun may otherwise discover and alter the ancestor workspace. Install Chromium with `PLAYWRIGHT_BROWSERS_PATH="$PWD/.hoplite/playwright/browsers" node .hoplite/playwright/node_modules/playwright/cli.js install chromium` from the repository root. No tracked dependency additions are needed.

The integration owner must execute both real-server profiles after the app is ready and inspect the generated screenshots. Preparing and syntax-checking these scripts does not establish that any of these application flows pass. Genuine provider login/callback, MFA, content mutation, streaming, and external integration flows remain separate acceptance gates.

## Scope and safety

The framework-independent runner is `scripts/migration/benchmark.mjs`, invoked with Node 24.11.1. It does not start the application, seed users, obtain authentication sessions, call external URLs, or assert feature parity. Keep raw JSON from both revisions. A fast 404 or sign-in redirect is not a working dashboard.

Use a dedicated checkout without dotenv files, and never run builds while another agent is building or benchmarking. The runner rejects `.env` and `.env.*` in the target directory and its ancestors (except `.env.example` and `.env.template`), because Next and Vite can load credentials even when their parent environment was sanitized. Do not rename or remove another agent's environment files; prepare a separate clean checkout instead. Application-specific dotenv paths outside this ancestry require a separate audit.

Build children receive only PATH, fixed locale/timezone, production mode, disabled telemetry, placeholder WorkOS credentials, disabled development impersonation, a nonsecret test encryption key, loopback application URLs, and the dedicated local database URL. No inherited service keys, HOME, NODE_OPTIONS, or proxy credentials are forwarded. Executable/config files are trusted code: this is credential isolation, not an OS network sandbox. Audit build-time network fetches and use an external egress restriction if a strict offline guarantee is required. Never supply production credentials in commands or config; config argv is recorded in results. The application server used for HTTP tests must independently use the same sanitized environment.

HTTP mode permits only literal loopback IP addresses over HTTP, follows no redirects, sends no cookies or authorization, and stores no response bodies, headers, or redirect destinations. Only timings, byte counts, statuses, and error names are stored. Routes must have explicit accepted statuses. It intentionally measures anonymous routes only; authenticated browser/security verification remains a separate acceptance gate.

## Isolated PostgreSQL

The local PostgreSQL 16 `main` cluster listens on port 5432. The migration database is **not** the existing `notra` database:

```text
DATABASE_URL=postgresql://notra_test:notra_test@127.0.0.1:5432/notra_migration_test
```

`notra_test` is a dedicated LOGIN role with no superuser, createdb, createrole, or replication privileges. Public CONNECT was revoked on this new database. Its schema has 77 public tables at the initial Next baseline and contains no copied customer data. No existing database schema was changed.

Initial creation commands, only when the role and database do not already exist:

```sh
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE notra_test LOGIN PASSWORD 'notra_test' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE DATABASE notra_migration_test OWNER notra_test;
REVOKE CONNECT ON DATABASE notra_migration_test FROM PUBLIC;
SQL
```

Do not drop, reset, or alter an existing database to rerun this procedure. Verify ownership and emptiness before schema creation. The committed migration chain assumes base tables already exist, and direct `db:push` orders composite foreign keys before their required unique indexes. For an empty test database, export the current schema and order all indexes before ALTER statements:

```sh
DATABASE_URL=postgresql://notra_test:notra_test@127.0.0.1:5432/notra_migration_test \
  ./node_modules/.bin/drizzle-kit export --config packages/db/drizzle.config.ts \
  > /tmp/notra-migration-schema.sql
python3 - <<'PY'
from pathlib import Path
text = Path('/tmp/notra-migration-schema.sql').read_text()
statements = [s.strip() for s in text.split(';') if s.strip()]
base = [s for s in statements if not s.startswith(('CREATE INDEX', 'CREATE UNIQUE INDEX', 'ALTER TABLE'))]
indexes = [s for s in statements if s.startswith(('CREATE INDEX', 'CREATE UNIQUE INDEX'))]
alters = [s for s in statements if s.startswith('ALTER TABLE')]
Path('/tmp/notra-migration-schema-ordered.sql').write_text(';\n'.join(base + indexes + alters) + ';\n')
PY
PGPASSWORD=notra_test psql -h 127.0.0.1 -U notra_test -d notra_migration_test \
  -v ON_ERROR_STOP=1 --single-transaction -f /tmp/notra-migration-schema-ordered.sql
PGPASSWORD=notra_test psql -h 127.0.0.1 -U notra_test -d notra_migration_test \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

The semicolon-based reorder was checked against this schema export; it is not a general SQL parser. Reassess it if future schema defaults/functions contain embedded semicolons. Keep schema/seed state identical across compared runs, and use only synthetic local fixtures for subsequent authenticated tests.

## Cold production build protocol

Save a JSON config outside the build output directories. All relative paths resolve against the runner's working directory. `command[0]` must be an absolute executable path; use `command -v node` to resolve it. Example for Next (replace paths with the actual isolated checkout):

```json
{
  "label": "next-baseline",
  "cwd": "/tmp/notra-baseline/apps/dashboard",
  "command": ["/absolute/path/to/node", "node_modules/next/dist/bin/next", "build"],
  "samples": 3,
  "timeoutMs": 900000,
  "output": "/tmp/notra-measurements/next-build.json"
}
```

```sh
node apps/dashboard/scripts/migration/benchmark.mjs build /tmp/next-build-config.json
```

Run the final production compiler directly, not root `dotenv`/Turbo wrappers or commands with a remote build cache. For TanStack, replace only the label, checkout path, output path, and direct production build command with the deployment owner's verified command; do not assume a generic Vite build includes the deployable server artifact.

Before **each** build sample the runner removes `.next`, `.output`, `dist`, `.tanstack`, and `.turbo` inside `cwd`. These names are disposable output directories in the intended dashboard checkout. This is application-output/cache cold, **not** cold OS page cache or cold dependency installation. It does not clear dependency caches under node_modules, shared package outputs, or arbitrary plugin caches. If the final compiler uses any such caches, remove them identically between samples using a documented separate procedure or classify the run as not comparable. Dependency installation and cache cleanup time are excluded from build timing.

The runner captures wall time, exit code/signal, and errors for every attempt. It stops on the first failed build, writes the failed sample, and exits nonzero. A timeout kills the direct child; if a compiler spawns background workers, confirm those have exited before another run. Successful-only summaries must never be presented as a passing complete run when `passed` is false or the sample count is short. Results are written incrementally and existing result files cannot be overwritten.

## HTTP route timing protocol

Start the production server separately on `127.0.0.1`, from the measured build, with the local-placeholder environment. Wait for readiness before timed samples. Keep server runtime, binding, database state, route order, sample counts, client runtime, and machine resources constant. Do not benchmark a dev server, external providers, or the preview tunnel.

Example config (replace the illustrative route/status contract with the verified baseline inventory):

```json
{
  "label": "next-anonymous",
  "cwd": "/tmp/notra-baseline/apps/dashboard",
  "baseUrl": "http://127.0.0.1:3000",
  "routes": [{ "path": "/sign-in", "statuses": [200] }],
  "warmup": 3,
  "samples": 20,
  "timeoutMs": 30000,
  "output": "/tmp/notra-measurements/next-http.json"
}
```

```sh
node apps/dashboard/scripts/migration/benchmark.mjs http /tmp/next-http-config.json
```

Requests are sequential, concurrency one, with Node fetch's default connection pooling and `Accept-Encoding: identity`. All warmups are recorded with negative indexes but excluded from summaries. `headersMs` is time to response headers (not browser TTFB); `totalMs` includes draining the full response body. Samples record received byte counts. Summaries show min, median, nearest-rank p95, and max, with no outlier removal. Unexpected status, network error, or timeout makes the complete run fail, including during warmup. Invalid samples remain in raw JSON and are excluded from successful-only latency summaries. These are warm-server anonymous route timings, not hydration, browser navigation, authenticated latency, server startup, or user-perceived performance.

Metadata includes revision, dirty-state flag, Node version, OS, CPU model/count, host memory, environment-profile version, and a hash of all harness `.mjs` files. Also retain the exact dependency lockfile/revision, Bun version, sandbox reservation/limit, production start command, seed revision, and any separate cache-cleanup commands in the integration owner's measurement notes. Report baseline/final raw values before percentages. Do not compare a baseline measured by a different protocol without rerunning it.

## Tests and acceptance gates

### Controlled baseline audit and final-run commands

The retained controlled baseline supersedes the earlier one-sample observation: `.hoplite/benchmarks/next-controlled/build.json` contains three successful builds at 344133.394, 354526.896, and 420296.755 ms (median 354526.896 ms). Its `http.json` contains three warmups and twenty measured requests per route, in this order: `/api/healthcheck`, `/robots.txt`, `/favicon.ico`, all expecting 200. Both records report Node 24.11.1, two logical CPUs, 16 GiB memory, a clean baseline checkout, and the same harness hash. These records cover only provider-free routes, not application parity.

The current harness hash differs from the hash in those controlled records. No preserved source copy of that older harness was found in the baseline checkout. Therefore, matching protocol intent is not enough to claim an exact comparison: rerun **both** revisions with the same current harness, or first recover and audit the exact historical harness. Do not overwrite the retained records. Machine resource metadata also cannot prove the absence of competing work during historical measurements.

After all concurrent implementation, builds, and timing work stops, prepare a complete isolated migrated checkout with the final source and installed locked dependencies, no dotenv ancestry, and the same Node/Bun versions. The following commands prepare fresh configs from the retained protocol without executing a build. Run from the repository root and set `MIGRATED_ROOT` to that isolated checkout's absolute root. The existing baseline checkout is `/tmp/notra-next-baseline`.

```sh
export MIGRATED_ROOT=/tmp/notra-start-final
export MEASUREMENT_ROOT="$PWD/.hoplite/benchmarks/final-comparable"
node --input-type=module <<'JS'
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const output = process.env.MEASUREMENT_ROOT;
mkdirSync(output, { recursive: true });
for (const [label, root, compiler] of [
  ['next', '/tmp/notra-next-baseline', 'node_modules/next/dist/bin/next'],
  ['start', process.env.MIGRATED_ROOT, 'node_modules/vite/bin/vite.js'],
]) {
  for (const mode of ['build', 'http']) {
    const config = JSON.parse(readFileSync(`.hoplite/benchmarks/next-controlled/${mode}-config.json`, 'utf8'));
    config.label = `${label}-final-comparable-node24-bun140`;
    config.cwd = realpathSync(join(root, 'apps/dashboard'));
    config.output = join(output, `${label}-${mode}.json`);
    if (mode === 'build') config.command = [process.execPath, compiler, 'build'];
    writeFileSync(join(output, `${label}-${mode}-config.json`), JSON.stringify(config, null, 2), { flag: 'wx' });
  }
}
JS
```

The final compiler currently configured by `apps/dashboard/package.json` is `vite build`; `nitro.config.ts` selects `node-server` when `VERCEL` is absent. The sanitized harness strips `VERCEL`, so these measurements compare local production builds, **not Vercel deployment artifacts**. Verify `.output/server/index.mjs` exists and starts successfully before interpreting a migrated build as deployable. Deployment preset verification remains a separate gate.

Execute these build commands serially, only after the integration owner declares the workspace quiet:

```sh
node apps/dashboard/scripts/migration/benchmark.mjs build "$MEASUREMENT_ROOT/next-build-config.json"
node apps/dashboard/scripts/migration/benchmark.mjs build "$MEASUREMENT_ROOT/start-build-config.json"
```

For HTTP, start only one server at a time on the retained baseline's port 3100. This foreground command starts the selected measured artifact with the exact placeholder environment; set `FRAMEWORK=next` for the baseline, then `FRAMEWORK=start` for the migrated server after stopping the baseline process. Run readiness and measurement commands from another shell. It does not use `preview.mjs`, whose public binding and port 3000 differ from this protocol.

```sh
FRAMEWORK=next node --input-type=module <<'JS'
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sanitizedEnvironment } from './apps/dashboard/scripts/migration/utils/sanitized-environment.mjs';
const framework = process.env.FRAMEWORK;
const config = JSON.parse(readFileSync(`${process.env.MEASUREMENT_ROOT}/${framework}-http-config.json`, 'utf8'));
const args = framework === 'next'
  ? ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100']
  : ['.output/server/index.mjs'];
const child = spawn(process.execPath, args, {
  cwd: config.cwd,
  env: { ...sanitizedEnvironment(), HOST: '127.0.0.1', PORT: '3100' },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
JS
```

For each matching server, wait for a successful healthcheck, then run the matching HTTP config:

```sh
curl --fail --silent --show-error http://127.0.0.1:3100/api/healthcheck
node apps/dashboard/scripts/migration/benchmark.mjs http "$MEASUREMENT_ROOT/next-http-config.json"
```

Replace `next-http-config.json` with `start-http-config.json` only after switching to the migrated server. Check all `passed` flags, raw statuses and byte counts, harness hashes, toolchain/resource metadata, and sample counts before calculating percentages. The commands above are prepared protocol instructions, not evidence that the migrated build, production start, or HTTP measurements have run successfully.

Focused tooling verification, from the repository root:

```sh
mise exec bun@1.4.0 -- bun test apps/dashboard/tests/migration
apps/dashboard/node_modules/.bin/tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --types bun-types/test,node apps/dashboard/tests/migration/benchmark.test.ts
node_modules/.bin/oxfmt --check apps/dashboard/scripts/migration apps/dashboard/tests/migration
node_modules/.bin/oxlint apps/dashboard/scripts/migration apps/dashboard/tests/migration
```

Tooling tests exercise credential stripping, dotenv rejection, loopback validation, manual redirects against a real local fixture server, raw sample output/failure behavior, non-overwrite protection, output-cache cleanup on a disposable fixture, and summary calculations. Fixture commands immediately exit; they are not dashboard benchmarks and establish no migration performance claim.

Reuse the existing real security tests, particularly `src/utils/local-dev-auth.test.ts`; do not replace auth providers or framework modules with blanket stubs just to make migration parity pass. The integration owner must run and record the existing full tests, lint, types, production build and production start, route inventory comparison, and deploy-artifact checks. Verify login/callback/logout, organization authorization and cross-tenant isolation, production impersonation refusal, redirect/cookie semantics, POST/webhook signature checks, oRPC/API methods and response contracts, streaming, scheduled handlers, static assets, and authenticated browser interactions. Actual provider flows require separately authorized sandbox credentials; placeholders cannot verify them.

The initial tooling deliverable did not run dashboard benchmarks or full migration acceptance checks. A subsequent provider-free HTTP baseline against the preserved Next build is retained in `.hoplite/benchmarks/next-baseline/http-provider-free.json`; it covers only healthcheck, robots.txt, and favicon.ico, not authenticated application parity. The original single Next build sample has unconfirmed coldness and must not be reported as a confirmed-cold baseline. Complete route/auth parity, full-suite/type/build results, and deployment results belong to the integration owner after the combined migration is ready. The initial workspace Bun was 1.3.1 while package.json declares 1.4.0. Bun 1.4.0 is now verified through `mise exec bun@1.4.0 -- bun`, and the focused tooling suite passes on it; pin the same toolchain on both sides and record the initial discrepancy rather than silently attributing toolchain effects to the framework migration.
