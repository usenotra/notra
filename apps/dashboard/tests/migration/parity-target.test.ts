import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parityTarget } from "./utils/parity-target.mjs";

test("parity runner refuses external targets and credential-bearing URLs", () => {
  expect(parityTarget("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  for (const value of [
    "https://example.com",
    "http://localhost:3000",
    "http://user:secret@127.0.0.1:3000",
    "http://127.0.0.1:3000/private",
    "http://127.0.0.1:3000?token=secret",
  ]) {
    expect(() => parityTarget(value)).toThrow();
  }
});

test("browser parity refuses reused artifact directories before replacing evidence", () => {
  const directory = mkdtempSync(join(tmpdir(), "notra-parity-artifacts-"));
  try {
    const screenshot = join(directory, "login-en.png");
    writeFileSync(screenshot, "retained-evidence");
    const run = spawnSync(
      "node",
      [
        new URL("browser-smoke.mjs", import.meta.url).pathname,
        "http://127.0.0.1:3000",
        "production-anonymous",
        directory,
      ],
      { encoding: "utf8", timeout: 5000 }
    );
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("EEXIST");
    expect(readFileSync(screenshot, "utf8")).toBe("retained-evidence");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
