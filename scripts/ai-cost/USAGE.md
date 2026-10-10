# Production-key usage attribution

`scripts/report-ai-usage.ts` requires an explicit **stable API key ID**. Select
the Upstash key's ID, not its display name; Jan is a development key and must
not be included. The authentication key and selected reporting key may differ.
There is no team-wide default and no credential is written to the report.
The selected API key ID is used only as a query filter, not printed in the JSON.

```sh
# AI_GATEWAY_API_KEY must already be set for reporting authentication.
bun --no-env-file scripts/report-ai-usage.ts \
  --api-key-id '<stable-Upstash-key-id>' \
  --start 2026-10-10 --end 2026-10-10 > usage.json
```

Both dates are inclusive UTC. Run after reporting has caught up (usually a few
minutes), preferably for a closed period. Inconsistent snapshots fail instead
of presenting a falsely reconciled total. `self` is also supported by Vercel,
but only use it when authenticating with the Upstash key itself.

Drill down with `--user-id '<organization-id>'`,
`--tag 'feature:geo-scan-grounded'`, `--tag 'scanId:<id>'`,
`--tag 'runId:<id>'` or `--tag 'sessionId:<id>'`. Multiple `--tag` filters use
**all**, not any. Each execution makes three reporting queries; it does not
perform model inference.

## Metadata and coverage

- Exactly one `feature:<name>` per instrumented request, retaining the existing
  feature tag for existing dashboards where space permits.
- `gateway.user` carries the organization. An explicitly supplied user is
  preserved. Public/anonymous requests do not get an invented organization.
- `runId`, `scanId`, `sessionId`, `turnId`, `chatId`, request and project/prompt
  IDs are carried as reporting tags when available. Background generation uses
  its job ID, or a generated run ID shared by its subcalls. Eve models and their
  model-selection evaluator receive the session and turn IDs.
- GEO answer/judge calls retain their scan/run context; the mention evaluator
  now receives that context too. GEO writer planning, writing and humanizing
  have separate canonical features while retaining the legacy `geo-writer` tag.
  Iris planner/content and image calls receive
  their run IDs. Feedback calls use the feedback ID as their run ID.
- Box image and GitHub mention agents use the documented `ai-reporting-tags`
  and `ai-reporting-user` headers via Box `attachHeaders`, scoped exclusively to
  `ai-gateway.vercel.sh`. Image snapshot restores get fresh context too. Image
  review subcalls share the same operation context. Box startup logs map the
  attribution run to its box ID.
- Router calls, direct Eve language models, and evaluators emit the existing
  `ai.call.*` lifecycle events. Completion records include tokens and available
  cache counters, correlation fields and generation/response IDs. Unreported
  costs remain `costSource: unknown`; the reporting API is the authoritative
  source for this key's spend. Generation IDs join subsequent cost enrichment.

The gateway allows at most ten tags of 64 characters each. IDs are never
truncated; oversized IDs remain in operational logs but are omitted from
reporting tags. Metadata contains only identifiers, not prompts, emails, keys
or provider credentials. Logging failures cannot replay successful inference.

## Reconciliation

The JSON contains:

- `total`: sum of the **model** buckets (each request counted once).
- `fullyAttributed`: requests with a known feature, user and a transmitted
  operation/correlation ID (`attribution:complete`).
- `incompletelyAttributed`: **total minus fully attributed**, including older
  requests without the coverage tag, public requests without an organization,
  and paths still missing context.
- `byFeature` and `unassignedFeature`: a separate feature-only partition.
- `byOrganization`, `missingOrganization`, `byModel`: independent breakdowns.
- `correlationTags` and `legacyTags`: overlapping drilldowns, **not additive**.

`fullyAttributed + incompletelyAttributed = total` for both cost and request
count. Do not sum organization gaps with feature gaps: they can refer to the
same requests. Never sum all tag rows; one request appears under multiple tags.
These are gateway-reported `total_cost` values, not market-price estimates,
customer credit charges or a guarantee of complete external BYOK invoices.

Coverage is prospective, after deployment. Historical legacy tags remain
visible but are not guessed into the new fully-attributed category. These
changes do not prove 100% production coverage, backfill historical requests,
change billing, or alter check counts, prompts, models, routing or caching.
No production credentials/customer data or paid inference are needed for local
verification. Box header injection and deployed coverage still need a live
operational check after release.

Reporting metadata has its own Vercel charges: currently $0.075 per 1,000
unique tag/user writes, and $5 per 1,000 reporting queries. Additional
correlation tags therefore have a small, nonzero cost; this is attribution work,
not a claim of additional inference savings.
At the maximum of ten tags plus one user, reporting writes cost $0.825 per
1,000 requests ($82.50 per 100,000), including existing tags. Actual overhead
depends on the context available at each call.

References: [Vercel Custom Reporting](https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting)
and the installed `@upstash/box` `BoxConfig.attachHeaders` / `fromSnapshot`
implementation. The installed AI SDK/provider types define the language and
evaluation model wrappers used here.
