import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("competitor drawer waits for its exit before navigating back", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/competitor-modal.fixture.tsx"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
