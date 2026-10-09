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
import { gzipSync } from "node:zlib";

import { UnsafeArchiveError } from "../src/errors";
import { readTarGz } from "../src/tar";

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
  test("reads PAX record lengths as bytes for Unicode paths", () => {
    const path = "blog/café.png";
    const records = Buffer.from(`23 path=${path}\n20 mtime=1760000000\n`);
    const blocks = [
      { name: "PaxHeader", type: "x", data: records },
      { name: "fallback", type: "0", data: Buffer.from("png") },
    ].flatMap((entry) => {
      const header = Buffer.alloc(512);
      header.write(entry.name);
      header.write(`${entry.data.length.toString(8).padStart(11, "0")}\0`, 124);
      header[156] = entry.type.charCodeAt(0);
      return [
        header,
        entry.data,
        Buffer.alloc((512 - (entry.data.length % 512)) % 512),
      ];
    });
    const files = readTarGz(
      gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)])),
      limits
    );
    expect(files.map((file) => file.path)).toEqual([path]);
    expect(Buffer.from(files[0]?.data ?? []).toString()).toBe("png");
  });

  test("rejects malformed negative entry sizes before processing extension records", () => {
    const header = Buffer.alloc(512);
    header.write("PaxHeader");
    header.write("-0000001000\0", 124);
    header[156] = "L".charCodeAt(0);
    expect(() => readTarGz(gzipSync(header), limits)).toThrow(
      UnsafeArchiveError
    );
  });

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
