import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("replay-only helpers and payload schemas bundle without backend dependencies", () => {
  const result = spawnSync(
    process.execPath,
    ["./tests/fixtures/workflow-import-boundaries.fixture.mjs"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
