# AI cost regression benchmarks

These are deterministic offline comparisons, not measured production savings.
Baseline: `main` at `74c26b09991614b88f8411837936b7af736afabd`.
Both checkouts use the same lockfile, Bun 1.4.2, and AI SDK 7.0.105. The
repository pins Bun 1.4.0; the measured runtime is recorded in each report.

## Reproduce

The PR's added regression suites and test fixtures were removed at the user's
request. Existing repository tests are unchanged. The benchmark harness and
saved reports remain; `worker.test.ts` is its isolated measurement worker,
not an added application regression suite. Test counts and fault-fixture
measurements below describe historical validation before that removal. Their
source remains available in commit `7a86accd7910d5fa3b13d8566ea4bb0cb8163095`.

Create a clean detached checkout at the baseline revision and install its
locked dependencies. No environment file or provider credentials are needed
for the benchmark.

```sh
git worktree add --detach ../notra-ai-cost-baseline 74c26b09991614b88f8411837936b7af736afabd
```

Run `bun install` in that checkout, then run from the candidate repository:

```sh
bun --no-env-file --no-install scripts/bench-ai-cost.ts --baseline ../notra-ai-cost-baseline --output ../ai-cost-benchmark.json
bun --no-env-file --no-install scripts/bench-ai-cost.ts --baseline ../notra-ai-cost-baseline --candidate ../notra-ai-cost-baseline --output ../ai-cost-control.json
```

One identical fixture pass runs per revision in separate, credential-free
processes. Unexpected fetch/preconnect attempts fail the worker. The report
records Git revisions, dirty state, source/fixture/harness/lockfile hashes,
runtime versions, provider call counts, request options, and UTF-8 JSON bytes.
The baseline-versus-baseline control must produce identical measurements.
Mock elapsed times and `bytes / 4` are deliberately not presented as latency
or token benchmarks.

The committed [`results.json`](./results.json) records clean baseline
`74c26b09991614b88f8411837936b7af736afabd` and clean implementation
`a58d7ea429b9821fb1a2b4c637193559a6be192b`. The following documentation-only
commit adds this snapshot; implementation code is unchanged.

- Fixture SHA-256: `18414db7023984c5e5a8dcf00d236763d32c31ca0f95ff8278acfc654d62e3cf`
- Harness SHA-256: `55e088200fc08a0adac36f5d07963c9d069eb08adcc549439e43b7e42f67f289`
- Baseline-versus-baseline control: identical complete revision results.

One combined multi-workspace `bun test --isolate` invocation on Bun 1.4.2
terminated with a runtime segmentation fault. Separate AI, GEO, and
agent/eval package processes completed successfully. Use separate processes
when reproducing the broad regression suite on that runtime; the benchmark
already isolates its revision workers. No runtime upgrade is included here.

Initial separate-process regression runs: AI 277, GEO 170 (one skipped),
agent/eval 49 (one opt-in benchmark skipped), dashboard 368, API 54: **918
passing tests**. Seven affected package typechecks, repository lint/format,
Knip, and the dashboard production build passed. Existing repository lint and
bundler warnings remain; no production credentials or paid inference were
used in these tests.

Follow-up review fixes do not replace the original clean-revision snapshot
above. [`results-review.json`](./results-review.json) records the same clean
baseline and clean reviewed implementation
`44c6b68eb609f0ac6d44cb790c7edc242566cc98`. Both revisions' complete harness
measurements are unchanged; Iris's opt-in historical comparison also remains
4→1 planner calls, 4→4 persistence attempts, and 1→0 ambiguous/failed action
re-executions. These checks are not new live-spend measurements.

Follow-up validation: AI 288, GEO 170 (one skipped), agent 52, eval 23,
dashboard 372, API 54: **959 passing tests** in separate package processes.
The image-agent fixture additionally runs 33 checks in its isolated child.
The agent suite includes 24 actual Redis Unix-socket cases covering concurrent
settlement/accumulation, replay, corrupted keys/fields, numeric overflow and
invalid arguments. These prove tested Redis ordering and preflight behavior,
not exactly-once remote billing or rollback on arbitrary server failures.

## Production-boundary comparison

Nine real feedback API submissions cover all eight supplied-field combinations
plus evaluator failure. The existing API admission guard is exercised in both
revisions: fully supplied feedback makes **zero calls before and after**.
All nine stored classification outputs match.

| Metric, fixed fixtures | Baseline | Candidate |
| --- | ---: | ---: |
| Completed feedback submissions | 9 | 9 |
| Feedback LLM provider calls | 8 | 5 |
| Feedback evaluator provider calls | 8 | 7 |
| Feedback evaluator questions | 16 | 12 |
| Feedback outbound prompt JSON bytes | 8,239 | 5,110 |
| Feedback response-schema JSON bytes | 5,200 | 3,250 |
| Feedback evaluator input JSON bytes | 8,166 | 6,300 |
| One full reference payload JSON bytes | 583 | 417 |
| Direct-classifier common prompt-prefix bytes | 977 | 977 |
| Completed GEO judge contexts | 3 | 3 |
| GEO judge / evaluator boundary calls | 3 / 2 | 3 / 2 |
| Unexpected external network attempts | 0 | 0 |

Reference writing samples, source URLs, applicability, and ordering remain
intact; only storage hashes/locators are removed from AI-facing serialization.
GEO results and complete judge prompts match. These GEO fixtures are **not
full persisted scans**. Existing scan/persona/workflow regression suites cover
scan execution separately. User-selected check counts, engine coverage,
prompts, languages, personas, cadence, search limits, and retries are unchanged.

Tool-cache cold/warm behavior, read/write outages, and subsequent recovery are
unchanged. Stable-prefix bytes demonstrate request layout, not provider cache
eligibility or observed cache hits. Automatic caching remains enabled; no
retention/privacy policy is changed.

## Writer and workflow fault fixtures

These are historical measurements from the removed writer/workflow regression
fixtures. To rerun them, use a separate checkout of
`7a86accd7910d5fa3b13d8566ea4bb0cb8163095` and its documented opt-in commands;
those suites are no longer part of the current branch.

| Metric, fixed mock responses/faults | Baseline | Candidate |
| --- | ---: | ---: |
| GEO writer provider calls | 3 | 2 |
| GEO writer cumulative serialized prompt characters | 36,244 | 16,121 |
| GEO writer humanizer calls | 1 | 1 |
| Saved draft characters | 11,298 | 11,298 |
| Invalid-output planner calls | 2 | 2 |
| Accounted completed planner tokens | 780 | 1,560 |
| Non-output planner failure calls | 2 | 1 |
| Background terminal-skip calls | 2 | 1 |
| Iris planner calls with three persistence failures | 4 | 1 |
| Iris persistence attempts for that fixture | 4 | 4 |
| Iris existing ambiguous/failed action re-executions | 1 | 0 |

Successful saves stop the GEO writer, but rejected saves remain repairable.
Background generation still supports multiple posts and revisions. The planner
repairs malformed output, not transport/accounting failures. Iris persists
planner output in a separate retryable step; inference is not retried because
persistence failed. Existing unknown/failed actions require explicit recovery.

Image timeouts await cancellation and confirm the exact run's terminal status
through the public backend run list before allowing recovery. A resolved SDK
`cancel()` alone is not confirmation: it can swallow HTTP failures. Unconfirmed
outcomes fail closed instead of starting duplicate inference. Briefly missing or
running exact-run records are checked up to five times, 250 ms apart, before
failing closed. Usage is retained after a finish event, a confirmed completed
backend result, or persisted nonzero usage on cancelled/failed terminal runs;
initialized all-zero unfinished-run counters remain unknown and cannot create
a minimum bill. A failed Iris action's original stored error remains visible
when a reporting retry skips execution.

Chat repair and reference measurements below also come from the removed
regression fixtures, available in the same historical commit.

| Metric, fixed repair/reference inputs | Baseline | Candidate |
| --- | ---: | ---: |
| Repair prompt UTF-8 bytes | 36,711 | 35,929 |
| Repair memory HTTP calls | 2 | 0 |
| Non-cancelled repair provider calls | 1 | 1 |
| Already-cancelled repair provider calls | 1 | 0 |
| Ten-reference payload UTF-8 bytes | 5,276 | 3,686 |

Repair keeps the selected model and validation schema, propagates cancellation,
and does not retrieve or persist conversation memory. History, signed approvals,
tool-call/result pairs, current documents, and explicit model choices are not
truncated or rerouted.

## Accounting is not provider savings

| Synthetic accounting fixture | Baseline USD | Candidate USD |
| --- | ---: | ---: |
| Mixed reported + estimated route total | 0.945 | 0.945 |
| Eve step with reported cost 0.132 | 0.264 | 0.132 |
| GEO judge, returned Flex tier | 0.000335 | 0.0001675 |
| GEO judge, returned standard tier | 0.000335 | 0.000335 |
| GEO judge, reported cost 0.004321 | 0.000335 | 0.004321 |
| GEO judge, reported zero | 0.000335 | 0 |
| Eval reported zero + market benchmark 0.50 | 0.50 | 0 |

The mixed route fixture retains 0.42 reported + 0.525 estimated. Gateway and
separate upstream BYOK subtotals are preserved without changing the existing
customer-total formula. Subtotals are known reported portions, not necessarily
complete breakdowns. Reported zero is distinct from missing cost. Requested
Flex is never taken as proof of the served tier or discounted a second time.
Eval market benchmarks are not actual spend; unknown/partial costs cannot win
the model picker as apparently free runs.

Review hardening also preserves component costs when the full total is unknown.
OpenRouter's credit charge is not a complete BYOK bill without explicit upstream
details. Missing/null upstream cost now retains the known gateway component and
uses the existing full-call estimate instead of claiming a reported total; the
component is not added again to that estimate. Explicit upstream zero and known
gateway-plus-upstream totals remain valid. Unknown eval runs no longer show an
invented zero subtotal, provenance stays visible in narrow picker columns, and
a failure before scoring is distinguished from unknown attempted-judge spend.

Completed call/cost events survive request-log closure, and logging sink errors
cannot retry successful inference or discard known costs. Code research uses
its enriched step cost instead of discarding it. Search Console suggestions
now propagate the tenant organization into routing and attribution.

Eve usage deduplication, bucket replacement, and TTLs use one Redis Lua operation.
The script preflights key types, safe integers, sums and TTLs before writing,
then replaces all buckets with one `HSET` before recording the marker.
Settlement reads the renamed frozen hash; a racing later step's separate
accumulator is retained without expiry and flagged for manual reconciliation,
not silently deleted or automatically charged again.
Completed steps also settle on failed/cancelled turns; successful billing is
independent of telemetry success. Billing outcomes that may have succeeded
remotely retain evidence and are **not automatically retried** without verified
idempotency/reconciliation. Mock failures and a local Redis check with 20
concurrent identical steps verify one accumulation, no replay increment, and
both TTLs; this is not proof of exactly-once remote billing.

## Deliberately deferred

- Production dollar savings, cache-hit rates, and quality/latency comparisons
  require live measurements; none are inferred from these fixtures.
- GEO judge replacement with Jev would lose competitor/excerpt extraction.
- Sticky auto routing, history compression, humanizer removal, and search-budget
  reductions lack behavior/quality evidence and are unchanged.
- Broad task-session reconciliation, evaluation-only GEO answer checkpoints,
  missing Jev usage aggregation, and ambiguous remote billing reconciliation
  remain separate work.
