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
    expect(changes.written).toEqual([]);
    expect(changes.deleted).toEqual([]);
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
    expect(changes.written).toHaveLength(0);
    expect(changes.skipped).toHaveLength(5);
  });

  test("keeps complete allowed patches including spaces and deletions", () => {
    expect(
      parseSandboxChanges("M\tdocs/new page.md\nD\tdocs/old.md", "")
    ).toEqual({
      written: ["docs/new page.md"],
      deleted: ["docs/old.md"],
      skipped: [],
    });
  });
});
