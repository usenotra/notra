import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readTarGz, UnsafeArchiveError } from "../src/tar";

const limits = {
  maxFiles: 100,
  maxBytes: 1024 * 1024,
  maxFileBytes: 512 * 1024,
};

function archive(
  setup: (dir: string) => void,
  extraArgs: string[] = []
): Uint8Array {
  const dir = mkdtempSync(join(tmpdir(), "sites-tar-"));
  setup(dir);
  const out = join(dir, "..", `${Date.now()}-${Math.random()}.tgz`);
  execFileSync("tar", ["-czf", out, ...extraArgs, "-C", dir, "."], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  return new Uint8Array(readFileSync(out));
}

describe("sandbox output archive", () => {
  test("reads regular files including long paths", () => {
    const longName = `${"nested/".repeat(20)}index.html`;
    const bytes = archive((dir) => {
      mkdirSync(join(dir, "blog", "nested/".repeat(20)), { recursive: true });
      writeFileSync(join(dir, "blog", "index.html"), "<h1>hi</h1>");
      writeFileSync(join(dir, "blog", longName), "deep");
    });
    const files = readTarGz(bytes, limits);
    expect(files.map((file) => file.path).sort()).toEqual(
      ["blog/index.html", `blog/${longName}`].sort()
    );
  });

  test("rejects links and oversized output", () => {
    const withLink = archive((dir) => {
      writeFileSync(join(dir, "a.html"), "x");
      symlinkSync("/etc/passwd", join(dir, "evil"));
    });
    expect(() => readTarGz(withLink, limits)).toThrow(UnsafeArchiveError);
    const big = archive((dir) =>
      writeFileSync(join(dir, "big.bin"), Buffer.alloc(600 * 1024))
    );
    expect(() => readTarGz(big, limits)).toThrow(UnsafeArchiveError);
  });
});
