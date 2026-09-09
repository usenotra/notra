import { expect, test } from "bun:test";

test("scan-scoped answer selection in an isolated module registry", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "test",
      "./tests/fixtures/prompt-answer-selection.fixture.ts",
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
});
