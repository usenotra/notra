import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("mounted modal navigation in an isolated DOM", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/route-modal.fixture.tsx"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 30_000,
    }
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
});
