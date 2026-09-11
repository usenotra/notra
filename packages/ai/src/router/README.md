# Model router

Plan-aware routing between the Vercel AI Gateway and OpenRouter, exposed to
the rest of the monorepo through `@notra/ai/gateway`:

```ts
import { gateway, assertRouteHasCredits } from "@notra/ai/gateway";

await assertRouteHasCredits({ organizationId });
const model = gateway("anthropic/claude-sonnet-5", { organizationId });
// pin a gateway when you rely on gateway-specific features:
const grounded = gateway("openai/gpt-5.4", { organizationId, gateway: "vercel" });
```

`gateway()` stays synchronous. It returns a lazy `LanguageModelV3`
(`RoutedLanguageModel`) that resolves its route on the first
`doGenerate`/`doStream`, so it composes with `withSupermemory`,
`wrapLanguageModel`, evlog and devtools exactly like the old Vercel-only model.

## Policy

| situation                   | gateway                |
| --------------------------- | ---------------------- |
| pinned via `gateway` option | as pinned, no fallback |
| no organization context     | openrouter             |
| paid plan                   | vercel                 |
| free plan                   | openrouter             |

The plan is resolved once per organization through `resolvePlan`
(`@notra/ai/billing/plan` → Autumn) and cached for 60 s.
The policy is defined in `@notra/ai/constants/router` and applies to all
organizations immediately. Development omits ZDR flags unless a caller sets
one explicitly; other environments enforce ZDR.

## Privacy

Strict requests (`zdr: "required"`) enforce zero data retention and no training:

- OpenRouter: `provider: { zdr: true, data_collection: "deny" }`.
- Vercel: `gateway: { zeroDataRetention: true, disallowPromptTraining: true }`.

If no compliant route is available, strict requests fail closed.

Callers that accept best-effort privacy pass `zdr: "preferred"`. The router
tries a compliant route first. If providers reject the privacy requirements
and no compliant fallback exists, it retries with ZDR and no-training defaults
relaxed. This includes Muse Spark's "No providers that disallow prompt training"
error. The result is logged as `ai.router.zdr_bypassed` with `zdrEnforced: false`.

Requests with `zdr: "none"` relax both defaults immediately. These modes work
outside development and do not depend on the development-only `allowNonZdr`
policy. Explicit caller no-training restrictions remain in effect.

OpenRouter receives `zdr: false` on relaxed calls to override the strict
provider and model defaults.

## Gateway coverage

`isModelSupported()` (`router/model-ids.ts`) consults
`VERCEL_UNSUPPORTED_MODELS` / `OPENROUTER_UNSUPPORTED_MODELS`
(`@notra/ai/constants/router`). A model that only exists on OpenRouter goes
there directly (`fallbackReason: unsupported-model`) instead of burning a
request on Vercel first. Add OpenRouter-only ids (and an alias in
`OPENROUTER_MODEL_ALIASES` when the OpenRouter id differs) when you add them
to a catalog.

## Provider options

Call sites use `withRouterDefaults()` from `@notra/ai/provider-options`, which
writes a neutral `providerOptions.notraRouter` block (`caching`,
`fallbackModels`, `reasoning`). The router translates it per gateway and strips
the other gateway's block, so `gateway` options never reach OpenRouter and vice
versa. Vendor blocks (`anthropic`, `openai`) pass through; for OpenRouter the
Anthropic thinking / OpenAI reasoning settings are mapped to
`openrouter.reasoning`.

## Observability

- evlog events: `ai.router.route`, `ai.router.fallback`,
  `ai.router.fallback_unavailable`, `ai.router.no_compliant_route`,
  `ai.router.zdr_rejected`, `ai.router.zdr_bypassed`,
  `ai.router.plan_lookup_failed`, `ai.router.credits`,
  `ai.router.credits_check_failed`, `ai.router.generation_lookup_failed`.
- `providerMetadata.notraRouter` on every result / stream `finish` part:
  gateway, generation ID, requested + mapped model, plan, reason and fallback
  info. `summarizeRouteUsage(steps)` (`@notra/ai/utils/route-usage`) also
  resolves Vercel generation details to include the upstream provider and
  gateway-reported cost without blocking token streaming.

## Extraction

`packages/ai/src/router/**` has no `process.env` reads and no `@notra/*`
imports; everything is injected through `createModelRouter(config)`. The
Notra-specific glue (fixed policy, Autumn plan lookup, evlog logger, singleton)
lives in `packages/ai/src/constants/router.ts` and `packages/ai/src/gateway.ts`.

Live smoke test: `bun packages/ai/evals/router/live-check.ts` (uses the keys
from `.env`, fake plan resolver).
