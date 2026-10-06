import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("project and session failures stop loading without resolving the wrong scope", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/chat-sessions.fixture.tsx"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
