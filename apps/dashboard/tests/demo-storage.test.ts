import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("demo storage stays bounded even when the ready pool is full", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/demo-storage.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
