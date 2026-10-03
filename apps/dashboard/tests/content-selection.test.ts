import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("editor selection context follows committed selections", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/content-selection.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
