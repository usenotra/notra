import { describe, expect, test } from "bun:test";

import { parseSandboxChanges } from "./github-mention-sandbox";

describe("parseSandboxChanges", () => {
  test("separates written, deleted, binary, and blocked paths", () => {
    const changes = parseSandboxChanges(
      [
        "M\tdocs/changelog/release 2.4.md",
        "A\tdocs/changelog/index.md",
        "D\tdocs/old.md",
        "A\tdocs/logo.png",
        "A\t.github/workflows/pwn.yml",
        "A\t.github/actions/setup/action.yml",
        "M\tsrc/server.ts",
        "D\tpackage.json",
      ].join("\n"),
      ["3\t1\tdocs/changelog/release 2.4.md", "-\t-\tdocs/logo.png"].join("\n")
    );
    expect(changes.written).toEqual([
      "docs/changelog/release 2.4.md",
      "docs/changelog/index.md",
    ]);
    expect(changes.deleted).toEqual(["docs/old.md"]);
    expect(changes.skipped.map((entry) => entry.path)).toEqual([
      "docs/logo.png",
      ".github/workflows/pwn.yml",
      ".github/actions/setup/action.yml",
      "src/server.ts",
      "package.json",
    ]);
  });

  test("caps the number of committed files", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `A\tdocs/${i}.md`);
    const changes = parseSandboxChanges(lines.join("\n"), "");
    expect(changes.written).toHaveLength(25);
    expect(changes.skipped).toHaveLength(5);
  });
});
