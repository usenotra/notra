import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { traceWorkflowDependencies } from "./framework-workflow-plugin";

describe("Workflow Vercel deployment", () => {
  test("adds CommonJS entries without removing Nitro's ESM trace entries", () => {
    const files = ["existing-esm-entry.js"];
    traceWorkflowDependencies(files, ["@cursor/sdk"]);
    expect(files[0]).toBe("existing-esm-entry.js");
    expect(files[1]).toBe(
      createRequire(import.meta.url).resolve("@cursor/sdk")
    );
    expect(() =>
      traceWorkflowDependencies([], ["@notra/nonexistent-workflow-package"])
    ).toThrow();
    const node = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `import { traceWorkflowDependencies } from ${JSON.stringify(import.meta.resolve("./framework-workflow-plugin.ts"))}; const files = []; traceWorkflowDependencies(files, ["@cursor/sdk"]); console.log(files[0]);`,
      ],
      { encoding: "utf8" }
    );
    expect(node.status).toBe(0);
    expect(node.stdout.trim()).toEndWith("/@cursor/sdk/dist/cjs/index.js");
  });
});
