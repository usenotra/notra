import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

import { importCycleDiagnostics } from "../src/utils/import-cycles";

test("cycles retain traversal order without leaking sibling or root trails", () => {
  const graph = new Map([
    ["root", ["a", "c"]],
    ["a", ["b"]],
    ["b", ["a", "b"]],
    ["c", ["d"]],
    ["d", ["c"]],
    ["other", ["other"]],
  ]);
  expect(
    importCycleDiagnostics([...graph.keys()], (path) => graph.get(path) ?? [])
  ).toEqual([
    {
      severity: "error",
      file: "a",
      code: "import_cycle",
      message: "Import cycle: a → b → a",
    },
    {
      severity: "error",
      file: "b",
      code: "import_cycle",
      message: "Import cycle: b → b",
    },
    {
      severity: "error",
      file: "c",
      code: "import_cycle",
      message: "Import cycle: c → d → c",
    },
    {
      severity: "error",
      file: "other",
      code: "import_cycle",
      message: "Import cycle: other → other",
    },
  ]);
});

test("shared acyclic descendants are visited once", () => {
  const graph = new Map([
    ["a", ["b", "c"]],
    ["b", ["d"]],
    ["c", ["d"]],
    ["d", []],
  ]);
  const visited: string[] = [];
  expect(
    importCycleDiagnostics([...graph.keys()], (path) => {
      visited.push(path);
      return graph.get(path) ?? [];
    })
  ).toEqual([]);
  expect(visited).toEqual(["a", "b", "d", "c"]);
});

test("the supported maximum import depth does not use the Node call stack", () => {
  const source = new URL("../src/utils/import-cycles.ts", import.meta.url).href;
  const result = spawnSync("node", [
    "--input-type=module",
    "-e",
    `import { importCycleDiagnostics } from ${JSON.stringify(source)};
    const paths = Array.from({ length: 9999 }, (_, index) => String(index));
    const diagnostics = importCycleDiagnostics(paths, path => Number(path) < 9998 ? [String(Number(path) + 1)] : []);
    if (diagnostics.length !== 0) process.exit(1);`,
  ]);
  expect(result.status, result.stderr?.toString()).toBe(0);
});
