# Dashboard TanStack Start migration status

Status on 2026-10-02: **post-cleanup standalone production verification passes; deployment sign-off remains open.** Changes are uncommitted. No production credentials or customer data were used for the checks below.

## Post-cleanup verification

Fresh cleanup evidence is retained in ignored `.hoplite/cleanup/`. This section supersedes pre-cleanup pass counts and diagnostic scores below; historical benchmarks were not repeated after cleanup.

The first cleaned production build exposed React hydration error 419. Shared UI still imported Next Link/Image, causing an SSR hook failure. Shared UI now accepts framework components through `FrameworkProvider`: the dashboard supplies its native components and the website explicitly supplies Next components. The shared UI package no longer depends on Next. Shared logging also used `evlog/next`; it now uses evlog's generic toolkit with tests for request isolation, structured errors, streaming completion, and drain scheduling.

The rebuilt standalone artifact passes all six production browser checks with normal motion and no uncaught errors, plus all seven HTTP contract checks. Fresh English login screenshot pixels were inspected. A separate agent-browser session verified the shared reset-password link reaches the forgot-password form without errors. The image endpoint passes GET optimization, a four-hour cache TTL, ETag conditional 304, and HEAD checks. Emitted JavaScript contains no bundled Next runtime module paths or `evlog/dist/next` modules.

Dashboard, shared UI, shared AI, and website typechecks pass. Shared framework/logging regression tests pass (10 tests); the complete shared AI test directory passes (13 tests). The full dashboard suite passes (283 source tests and 194 integration/tooling tests). The forbidden-import guard now covers dashboard, shared UI, and shared AI source, including `evlog/next`.

The final sanitized Vercel build passes with 117 steps and 20 workflows. The rebuild exposed request-only localization entering background Workflow bundles through GEO shelf mutations and a billing entitlement lookup. Request-only mutations now live in `lib/geo-shelf/request-service.ts`, and the background-safe entitlement lookup lives in `utils/resolve-zdr-entitlement.ts`. No unresolved TanStack virtual modules were externalized to hide the failure. Copied step and flow functions outside the checkout load their POST/HEAD exports; the copied step artifact also loads Cursor SDK and renders PNG through native Resvg. Live Vercel routing and queue delivery remain unverified.

Repository lint reports zero errors but still exits nonzero with thousands of existing warnings; it is not a clean lint pass. React Doctor reports 70/100, unchanged from the beginning of this cleanup pass. Remaining `src/app` wrappers have incoming references and are retained rather than deleted by filename convention.

Use Bun 1.4.0 explicitly in this sandbox (`mise exec bun@1.4.0 -- ...`); the default shell Bun is older. Frozen-lockfile installation passes with 1.4.0. Browser smoke uses `PLAYWRIGHT_BROWSERS_PATH="$PWD/.hoplite/playwright/browsers"` as documented in the testing runbook.

Final commands include:

```sh
mise exec bun@1.4.0 -- bun run --cwd apps/dashboard test
mise exec bun@1.4.0 -- bun run --cwd apps/dashboard check-types
mise exec bun@1.4.0 -- bun test packages/ai/tests
mise exec bun@1.4.0 -- bun test packages/ui/src/components/framework-provider.test.tsx
PLAYWRIGHT_BROWSERS_PATH="$PWD/.hoplite/playwright/browsers" node apps/dashboard/tests/migration/browser-smoke.mjs http://127.0.0.1:3000 production-anonymous .hoplite/cleanup/browser-production-complete
node apps/dashboard/tests/migration/http-smoke.mjs http://127.0.0.1:3000 .hoplite/cleanup/http-complete.json
```

Builds invoke `node node_modules/vite/bin/vite.js build` from `apps/dashboard` in a child process using the runbook's `sanitizedEnvironment()` after `assertNoDotenv()`. The Vercel build adds only `VERCEL=1` and `NITRO_PRESET=vercel`. Final build logs are `build-standalone-complete.log` and `build-vercel-passed.log` under `.hoplite/cleanup/`. Formatting and `git diff --check` pass. The managed preview's automatic probe still reports a degraded browser verdict, while fresh isolated Playwright and agent-browser sessions pass; do not conflate the automatic probe with those independent results.

## Verified behavior

- Production login renders with English and German localization, locale-cookie precedence, and anonymous session handling.
- Anonymous protected-page requests redirect to login with `returnTo`.
- All 71 original route-handler files have native Start dispatch routes, including optional `/rpc` index/catch-all routes and both OAuth discovery endpoints.
- Anonymous oRPC calls reach authorization and return 401 rather than falling through to a page 404.
- Synthetic local users can list their own organization but not another tenant's organization. Cross-tenant page access is denied.
- Direct Framer navigation renders a standalone page. Hydrated soft navigation opens a dialog without replacing the document; Escape restores the background. Separate browser investigation also exercised Forward and standalone rendering after reload.
- Loopback-only development impersonation rejects public forwarded IPs with 403, matching the original Next proxy, and does not expose the synthetic identity.
- A copied `.output` artifact runs outside the repository without workspace `node_modules`. Healthcheck, login, protected redirect, anonymous oRPC authorization, and local SVG optimization passed there.

The auth runtime fix uses WorkOS middleware context and native server-side auth lookup helpers. Server-only lookups no longer nest redundant RPC wrappers inside Start handlers. Session construction and database membership checks remain in place.

## Automated checks

Use Bun 1.4.0 and Node 24.11.1. The sandbox's default `bun` initially resolved to 1.3.1, so verification explicitly prepended the installed 1.4.0 binary directory to `PATH`.

| Check | Result |
| --- | --- |
| `cd apps/dashboard && bun run check-types` | Pass |
| `cd apps/dashboard && bun run test` | 283 source tests and 196 integration/tooling tests pass |
| `node apps/dashboard/tests/migration/http-smoke.mjs http://127.0.0.1:3000 <new-output.json>` | 7 checks pass against sanitized production artifact |
| `PLAYWRIGHT_BROWSERS_PATH=.hoplite/playwright/browsers node apps/dashboard/tests/migration/browser-smoke.mjs http://127.0.0.1:3000 production-anonymous <new-artifact-directory>` | 6 checks pass with normal motion; zero uncaught errors |
| Same browser command with `development-fixture` | 12 checks pass with the dedicated synthetic database |
| `bun apps/dashboard/tests/migration/data-smoke.mjs http://127.0.0.1:3000 <new-output.json>` | 11 real-data checks pass, including exact fixture cleanup |
| `oxfmt --check` on changed/new migration files, excluding generated route tree | Pass |
| `oxlint --config oxlint.config.ts` on those files | No errors; 2 dynamic image-style warnings |
| `npx react-doctor@latest --verbose --scope changed` | 90/100; 2 non-component-export warnings in onboarding split layout |
| `git diff --check` | Pass |

The repository-wide `bun run check` is not green: its recorded run reported 8,162 warnings and formatting findings. Migration-owned formatting was subsequently corrected and checked separately; repository-wide lint debt was not swept into this migration.

The browser fixture waits for the Framer link's React click handler before testing client navigation. The initial test clicked SSR markup before hydration and therefore performed a full document load. The readiness probe uses private React DOM properties and must be revisited if React changes that representation. The forwarded-IP test was corrected from an erroneous 200/null expectation to the original proxy's 403 contract; authorization was not weakened.

## Paired local benchmarks

The paired run supersedes earlier baseline observations. Both revisions use the same current benchmark harness, Node 24.11.1, Bun 1.4.0 on `PATH`, sanitized placeholder environment, local database, output/cache-clearing list, and sandbox. Each build invokes its framework compiler directly, not Turbo or deployment hooks. Neither build includes full TypeScript checking; that check runs separately. The Next build explicitly reports that type validation is skipped.

The baseline is the clean original checkout; the Start candidate is the uncommitted migration. Both result files report two logical CPUs and 16 GiB visible memory. The platform separately reports a four-vCPU reservation/ceiling and an 8 GiB reservation/16 GiB memory ceiling. No intentional builds, tests, or dev-server work overlapped these measurements. This is not a dedicated host, and host contention, filesystem page cache, and sequential framework order are not controlled.

### Production build wall time

| Framework | Sample 1 | Sample 2 | Sample 3 | Median |
| --- | ---: | ---: | ---: | ---: |
| Original Next | 172.043 s | 163.764 s | 176.553 s | 172.043 s |
| TanStack Start | 32.441 s | 32.800 s | 37.493 s | 32.800 s |

The measured median build wall time is approximately **80.9% lower** for this Start candidate. Three local samples are not a general performance guarantee. The older Next median of 354.53 seconds came from a different harness state and a window with overlapping work; it is not used for this comparison.

### Warm-server HTTP response time

Same port, sequential servers and requests, three warmups then twenty measured requests per route, concurrency one, `Accept-Encoding: identity`, and expected status 200. Values include draining the response body, not browser hydration or user-perceived latency. Each server received one healthcheck readiness probe before the harness warmups.

| Route | Next median / p95 | Start median / p95 |
| --- | ---: | ---: |
| `/api/healthcheck` | 1.993 / 3.479 ms | 1.294 / 2.682 ms |
| `/robots.txt` | 1.717 / 2.249 ms | 0.949 / 2.083 ms |
| `/favicon.ico` | 1.458 / 1.947 ms | 0.865 / 1.141 ms |

These provider-free routes do not establish authenticated dashboard, database-heavy, streaming, model-generation, image-cache, cold-start, or deployed performance parity.

Exact configs, raw samples, and logs are retained in ignored `.hoplite/benchmarks/paired-final/`. Run each framework's build with:

```sh
node apps/dashboard/scripts/migration/benchmark.mjs build <framework-build-config.json>
node apps/dashboard/scripts/migration/benchmark.mjs http <framework-http-config.json>
```

See [migration-testing.md](./migration-testing.md) for the sanitized environment, cache-clearing rules, database setup, and server-start protocol. The harness refuses to overwrite existing results.

## Remaining sign-off gates

- The Vercel bundling blocker is resolved with version-pinned Bun patches for `@workflow/nitro@4.1.14` and `@workflow/builders@4.1.13`: forward external packages, package traced native/CommonJS dependencies, preserve function architecture, and compile JSX in the Vercel step bundle. Sanitized output generation passes (117 steps, 20 workflows). A copied step function outside the repository loads its handler and Cursor SDK and renders PNG through native Resvg. The largest function is 210,585,933 bytes (200.83 MiB), below the 250 MB limit; all inspected functions use Node 24/x86_64. These patches need review on SDK upgrades. Live hosted routing and queue delivery remain unverified.
- The copied standalone artifact was exercised on the sandbox host, not inside a built Docker image. Docker is unavailable; `sandbox_control reprovision` returned `not_required`. Actual container verification requires Settings → Project → Sandbox → Docker Compose and a new thread. No Docker build/run success is claimed.
- Real WorkOS login, session refresh, MFA, logout, provider callbacks, billing, model generation, and production Workflow execution require separate end-to-end validation. SDK tests with fake credentials do not prove live-provider behavior.
- Auth artwork now detects WebGL2 availability and retains the static gradient when unavailable. Normal-motion production browser smoke passes.
- The image endpoint now has a bounded in-memory cache, upstream TTL handling with a four-hour minimum, ETags, conditional 304, and HEAD support, with production HTTP checks. It still does not reproduce Next's persistent optimizer cache, stale revalidation, or in-flight coalescing. Do not infer equivalent caching performance from the HTTP benchmark.
- Dashboard cleanup replaces compatibility imports with native framework modules and removes Next-specific dependencies, configuration, aliases, and dead page entry points. Retained `src/app` feature components and request handlers are imported by Start routes; they are not filesystem route registration. Existing `NEXT_PUBLIC_*` deployment variable names and the framework-independent `next-themes` package remain intentionally. Other apps' Next.js dependencies and historical benchmark comparisons are outside this dashboard cleanup.

Current results are a verified local migration checkpoint, not an assertion that every production integration has parity or that the migration is ready to deploy.

The historical verification results below predate the dashboard dependency and dead-source cleanup. Use the post-cleanup verification section above for current evidence.

## Expanded verification checkpoint

Fresh results are in ignored `.hoplite/verification-complete/`. The final serialized full suite passes; an earlier combined run exposed module-mock contamination in the new response-lifetime test, fixed using the repository's subprocess-fixture pattern. A company-logo test timed out while the heavyweight development preview was active and passed in the final serialized full run without changing its assertions or timeout.

The data suite creates, reads, sanitizes, validates, updates, and deletes manual drafts through real oRPC and verifies persistence, tenant isolation, public-forwarded-IP denial, GET mutation rejection, and exact cleanup. Expanded browser checks verify content/skills pages and populated settings. They exposed query loss in stored-mode redirects; both server and client redirects now preserve settings queries, with a regression test. A cold settings-pane load initially timed out; the complete rerun passed with unchanged 30-second assertions.

`tests/workflow-runtime.test.ts` builds the actual dashboard Workflow plugin into a provider-free fixture, runs a step, persists serialized Map/Date values and a hook, kills the server, restarts it, resumes the hook, and verifies completion without replaying the first side effect. Response-lifetime tests verify streamed completion, cancellation, request isolation, and `waitUntil` registration. Neither test establishes hosted Workflow provider behavior.

The managed preview is restored to sanitized anonymous production. Its automatic browser probe timed out, but explicit production browser smoke and an agent-browser login inspection pass. Scoped authored-file lint has no errors; the pre-existing auth gradient adds one off-token warning to the previously noted image warnings. React Doctor remains 90/100.
