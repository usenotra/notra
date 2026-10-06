import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("chat history loads one scoped snapshot and preserves deleted, stream and Slack state", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/fixtures/chat-history.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
