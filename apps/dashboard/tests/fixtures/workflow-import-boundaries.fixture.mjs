import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import { build, Transpiler } from "bun";

const transpiler = new Transpiler({ loader: "ts" });
for (const file of await readdir("src/workflows")) {
  if (!file.endsWith(".ts")) {
    continue;
  }
  const imports = transpiler.scanImports(
    await readFile(`src/workflows/${file}`, "utf8")
  );
  for (const { path } of imports) {
    assert.ok(
      path !== "@notra/ai/billing/content-billing" &&
        path !== "@notra/geo-core/schemas/geo",
      `${file} imports ${path} into replay instead of a narrow pure module`
    );
  }
}

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
