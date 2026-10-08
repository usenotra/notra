import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("user workspace deletion guards and teardown ordering", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/user-organization-teardown.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
