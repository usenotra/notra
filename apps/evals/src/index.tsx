import { parseArgs } from "node:util";

import { loadRepoEnv } from "./utils/env";

loadRepoEnv();

const HELP = `notra evals: compare models on the content harness

  bun run evals                      interactive TUI
  bun run evals --demo               TUI with simulated models (no API calls)
  bun run evals list                 list suites
  bun run evals runs                 list saved runs
  bun run evals run <suite> [opts]   headless run (CI / agents)
  bun run evals pick [--tolerance n] cheapest model per stage from saved runs

options
  --demo                 simulate models instead of calling the gateway
  --models a,b           gateway model ids (default: the suite's prod models)
  --repeats n            runs per case and model (default 1)
  --concurrency n        parallel calls (default 6)
  --cases id,id          only these case ids
  --suite id             preselect a suite in the TUI
  --tolerance n          allowed score drop below the best model, in pts (pick)
  --json                 print the summary as JSON (headless)
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    demo: { type: "boolean", default: false },
    models: { type: "string" },
    repeats: { type: "string", default: "1" },
    concurrency: { type: "string", default: "6" },
    cases: { type: "string" },
    suite: { type: "string" },
    json: { type: "boolean", default: false },
    tolerance: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const list = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const command = positionals[0];

if (values.help) {
  console.log(HELP);
} else if (command === "list") {
  const { printSuites } = await import("./headless");
  printSuites();
} else if (command === "runs") {
  const { printRuns } = await import("./headless");
  await printRuns();
} else if (command === "pick") {
  const { printPicks } = await import("./headless");
  const tolerancePts =
    values.tolerance === undefined ? undefined : Number(values.tolerance);
  if (tolerancePts !== undefined && !Number.isFinite(tolerancePts)) {
    console.error(`--tolerance must be a number, got "${values.tolerance}"`);
    process.exit(1);
  }
  await printPicks({
    demo: values.demo ?? false,
    tolerancePts,
    json: values.json ?? false,
  });
} else if (command === "run") {
  const { runHeadless } = await import("./headless");
  const suiteId = positionals[1];
  if (!suiteId) {
    console.error("Usage: bun run evals run <suite> [--models a,b] [--demo]");
    process.exit(1);
  }
  process.exit(
    await runHeadless({
      suiteId,
      models: list(values.models),
      repeats: Math.max(1, Number(values.repeats) || 1),
      concurrency: Math.max(1, Number(values.concurrency) || 6),
      demo: values.demo ?? false,
      caseIds: list(values.cases),
      json: values.json ?? false,
    })
  );
} else {
  const { createCliRenderer } = await import("@opentui/core");
  const { createRoot } = await import("@opentui/react");
  const { App } = await import("./ui/app");
  const demo = values.demo || !process.env.AI_GATEWAY_API_KEY;
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  });
  createRoot(renderer).render(
    <App initialDemo={demo} initialSuiteId={values.suite} />
  );
}
