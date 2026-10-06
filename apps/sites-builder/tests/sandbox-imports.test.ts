import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");
const RUNTIME_WORKSPACE_IMPORT =
  /^import\s+(?!type\b)[^;]*?from\s+"@notra\/(?!builtins|custom-css)[^"]+"/ms;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("the theme only imports workspace packages for types", () => {
  const offenders = files(SRC)
    .filter((path) => /\.(?:ts|tsx|astro|mjs)$/.test(path))
    .filter((path) =>
      readFileSync(path, "utf8")
        .split(/(?=^import\s)/m)
        .some((chunk) => RUNTIME_WORKSPACE_IMPORT.test(chunk))
    );
  expect(offenders).toEqual([]);
});
