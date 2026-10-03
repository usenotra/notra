import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("company logo RPC enforces the user's paid lookup budget", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/company-logo-rate-limit.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
