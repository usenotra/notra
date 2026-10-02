import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("GSC sync and project-scoped mutations in an isolated runtime", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/gsc-sync-workflow.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 30_000,
    }
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}, 35_000);
