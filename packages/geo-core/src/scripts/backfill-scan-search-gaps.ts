import { parseArgs } from "node:util";

import { Effect } from "effect";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    organization: { type: "string" },
    project: { type: "string" },
    help: { type: "boolean" },
  },
});

if (values.help || !values.organization || !values.project) {
  console.log(
    "Usage: bun --env-file=.env packages/geo-core/src/scripts/backfill-scan-search-gaps.ts --organization <id> --project <id>\nProcesses the last 30 days of completed scans for exactly one project. Requires DATABASE_URL. Does not run scans or call a model."
  );
  process.exit(values.help ? 0 : 1);
}

const { refreshScanSuggestions } = await import("../geo/scan-suggestions");
try {
  const result = await Effect.runPromise(
    refreshScanSuggestions({
      organizationId: values.organization,
      projectId: values.project,
    })
  );
  console.log(`Created ${result.inserted} scan search gaps.`);
  process.exit(0);
} catch (error) {
  console.error("Scan search gaps backfill failed:", error);
  process.exit(1);
}
