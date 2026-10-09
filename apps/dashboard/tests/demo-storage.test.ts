import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test.each(["4", "1000"])(
  "demo storage remains isolated from inherited pool size %s",
  (poolSize) => {
    const result = spawnSync(
      process.execPath,
      ["test", "./tests/fixtures/demo-storage.fixture.ts"],
      {
        cwd: new URL("..", import.meta.url).pathname,
        encoding: "utf8",
        env: { ...process.env, NOTRA_DEMO_POOL_SIZE: poolSize },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr).toBe(0);
  }
);
