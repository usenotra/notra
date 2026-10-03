# evals

Model comparison harness for the content pipeline, with an OpenTUI interface.

```sh
bun run evals            # TUI (falls back to demo without AI_GATEWAY_API_KEY)
bun run evals --demo     # simulated models, no API calls
bun run evals run content-draft --models anthropic/claude-sonnet-5,openai/gpt-6-sol
bun run evals list       # suites
bun run evals runs       # saved runs
bun run evals pick       # cheapest model per stage from the saved runs
```

Reads the repo root `.env` (only `AI_GATEWAY_API_KEY` is needed). Runs are saved to `apps/evals/.runs/<id>.json` while they run, so a crash keeps partial results and errors can be retried from the results view.

## Suites

| Suite | Mirrors | Scored on |
|---|---|---|
| `content-draft` | background-gen writing step, gathering replayed | decision, hard rules, Jev judge |
| `content-unslop` | background-gen unslop pass | slop removed, facts kept, grounding |
| `content-agent` | full `runBackgroundGen` loop | everything above + tool use |
| `collection-title` | `jobs/collection-title.ts` | format rules, brand spelling, Jev |
| `chat-router` | `orchestration/router.ts` (Jev vs LLM) | complexity, tools, reasoning, route |
| `feedback-classifier` | `jobs/feedback-classifier.ts` (Jev vs LLM) | kind, sentiment |

The content suites import the real dispatcher prompt, skills, user prompt and tool definitions from `@notra/ai`. Only the tools' `execute` functions are swapped for fixture data (`src/fixtures/content-scenarios.ts`), so nothing touches the DB, GitHub or Redis.

Jev (`typesafe-ai/jev`) is the judge for generated text: typed questions, calibrated probabilities, ~300 ms per case.

## Picking models

`p` on the home screen (or `bun run evals pick`) builds a plan from the saved runs: for every stage it takes the latest run per model and recommends the cheapest model that scores within the tolerance of the best one (default 2 pts, `←→`), has at least 5 scored cases (or all of a smaller suite) and fails no more than 10% of calls. Baseline is the model prod uses today, imported from `@notra/ai/constants`.

Set real calls per month with `+/-` to see $/month and the saving; `content-draft` and `content-unslop` run inside the content agent's call, so their spend is left out of the total. Untested catalog models that would be cheaper (average tokens × gateway price) are listed under the table. `v` starts a verification run (prod, pick, frontier and the two cheapest untested models, 2 repeats each) so a pick never rests on one noisy run. Settings are kept in `.cache/picker.json`.
