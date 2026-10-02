import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("response-lifetime callbacks in an isolated runtime", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/after-response.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 30_000,
    }
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
});
