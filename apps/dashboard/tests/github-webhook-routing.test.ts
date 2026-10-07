import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("GitHub webhook authorization and signatures use one narrow query", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/github-webhook-routing.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
