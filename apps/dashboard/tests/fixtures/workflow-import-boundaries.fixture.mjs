import assert from "node:assert/strict";

import { build } from "bun";

const result = await build({
  entrypoints: [
    "../../packages/ai/src/utils/content-billing-messages.ts",
    "../../packages/geo-core/src/schemas/geo-workflows.ts",
  ],
  target: "browser",
  write: false,
});
assert.ok(result.success, result.logs.map(String).join("\n"));
for (const output of result.outputs) {
  const code = await output.text();
  for (const forbidden of [
    "autumn-js",
    "node-postgres",
    "geoSettingsUpsertInputSchema",
    "geoWriterPlanInputSchema",
  ]) {
    assert.ok(
      !code.includes(forbidden),
      `Replay imports pulled in ${forbidden}`
    );
  }
}
