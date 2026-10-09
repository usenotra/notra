import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("invitation decisions enforce recipient identity and recover safely", () => {
  const result = spawnSync(
    process.execPath,
    ["--no-env-file", "test", "./tests/fixtures/invitations.fixture.ts"],
    {
      cwd: new URL("..", import.meta.url).pathname,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      encoding: "utf8",
      timeout: 15_000,
    }
  );
  expect(result.status, result.stderr).toBe(0);
});
