# Runner verification, 2026-10-07

The final implementation was exercised in an isolated Daytona sandbox on Linux
x86-64 with Bun 1.4.0, 2 CPUs, 4 GiB RAM, and 8 GiB disk. Source uploads contained
Git-tracked files only. No production database, billing key, or provider key was
sent to the sandbox. Database tests use PGlite; provider and billing boundaries
are deterministic test doubles.

| Check | Observed result |
| --- | --- |
| Full GEO Core suite | 153 passed, 0 failed, 677 assertions |
| Runner HTTP, queue and shutdown suite | 19 passed, 0 failed, 173 assertions |
| Shared AI router tests, locally | 42 passed |
| DB migration guard | 111 migrations validated against `origin/main` |
| Local typechecks | Runner, Core, DB, AI, dashboard, and API passed |
| Daytona runner typecheck and bundle | Passed with Bun 1.4.0 |
| Repository formatting/lint and pre-commit Knip | Passed; existing UI lint warnings remain |
| Dockerfile | All three stages built in Daytona from the pinned Bun Alpine image |

The compiled bundle was also started as an actual HTTP process, using an
unreachable placeholder database URL and no provider or billing credentials.
`/health` returned `200`, `/ready` returned `503`, unauthenticated scan creation
returned `401`, malformed JSON returned `400`, and an oversized body returned
`413`. A burst of 100 unauthenticated requests was entirely rejected. Idle
SIGTERM shutdown exited with code 0 in 11 ms in that sandbox.
The final Alpine image repeated those status and burst checks successfully;
idle SIGTERM shutdown exited with code 0 in 10 ms. All test sandboxes were
deleted after verification.

Reproduce the isolated suites from the repository root:

```sh
bun install --frozen-lockfile
bun run --filter=@notra/geo-core test
bun run --filter=geo-runner test
bun run --filter=geo-runner check-types
bun run --filter=geo-runner build
bun run db:check --base=origin/main
docker build -f apps/geo-runner/Dockerfile -t notra-geo-runner .
```

The tests exercise malformed and oversized bodies, missing/weak/incorrect
credentials, organization/project isolation, idempotency conflicts, unsupported
models and languages, unavailable web search, ZDR restrictions, empty answers,
provider failures, and stale scans. They also cover concurrent atomic claims,
full queue capacity, duplicate offers, local draining, cancellation and billing
release, cleanup rejection, and cleanup that never resolves.

A two-replica regression reproduces a rejecting creator racing an accepted
same-key retry. The rejected request must leave the durable scan intact.
Readiness tests verify missing configuration and an absent scan table return
`503`. Search source candidates alone must leave `ownedSourceCited=false`.

The result-field fixture verifies USD 0.25 for the answer plus USD 0.50 for the
judge produces `costUsd=0.75`, `judgeTokens=7`, and billing usage of 9 total
tokens. These are fixture values, not measured real-provider prices.

The initial default 1 GiB sandbox hit its memory limit while installing the
monorepo. Installation succeeded in the larger sandbox. Running all monorepo
typechecks concurrently also exceeded its memory budget; the relevant host and
package typechecks passed locally. These failures do not establish runner
memory requirements under production load.

## Remaining production checks

The Railway service is provisioned and configured, but has no source or active
deployment. `AUTUMN_SECRET_KEY` was unavailable. No production migration,
billable model call, or production Axiom drain was verified. Follow the
[activation steps](README.md#railway-setup) before enabling callers.

The in-process queue has no automatic restart recovery. A same-key retry or
explicit reoffer recovers queued work; otherwise it expires after 12 hours.
The concurrency tests simulate multiple replicas through real database claims
and separate queue handlers. They do not constitute a sustained Railway load test.
