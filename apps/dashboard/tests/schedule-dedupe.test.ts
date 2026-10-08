import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("schedule RPCs reject canonical and exact legacy API duplicates", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/schedule-dedupe.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
