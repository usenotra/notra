import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("scan-scoped answer selection in an isolated module registry", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/prompt-answer-selection.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
