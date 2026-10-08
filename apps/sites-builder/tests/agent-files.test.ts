import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  instructionsSection,
  llmsTxt,
  normalizeAgentInstructions,
  writeAgentFiles,
} from "../compiler/agent-files";

const AREA = {
  area: "blog" as const,
  title: "Blog",
  indexPath: "/blog",
  entries: [],
};

test("Markdown 404 artifacts use native root and nested mount links without entering agent maps", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "notra-markdown-404-"));
  try {
    await writeAgentFiles({
      outDir,
      origin: "https://acme.example.com",
      siteName: "Acme",
      areas: [
        { ...AREA, indexPath: "/" },
        {
          ...AREA,
          area: "changelog",
          title: "Changes",
          indexPath: "/product/changes",
        },
      ],
      pageHtml: new Map(),
      instructions: [],
      notFound: { redirect: false },
    });
    for (const mount of ["", "/product/changes"]) {
      const markdown = await readFile(join(outDir, mount, "404.md"), "utf8");
      expect(markdown).toStartWith(
        "# This page doesn't exist\n\nIt may have moved, or the link is wrong."
      );
      expect(markdown).toContain(`(${mount}/index.md)`);
      expect(markdown).toContain(`(${mount}/llms.txt)`);
      for (const map of ["index.md", "llms.txt", "llms-full.txt"]) {
        expect(await readFile(join(outDir, mount, map), "utf8")).not.toContain(
          "404.md"
        );
      }
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

describe("markdown.instructions", () => {
  test("a string or a list becomes a labelled section", () => {
    expect(normalizeAgentInstructions(undefined)).toEqual([]);
    expect(normalizeAgentInstructions("  Be nice. ")).toEqual(["Be nice."]);
    expect(instructionsSection([])).toBeNull();
    expect(instructionsSection(["One."])).toBe(
      "## Instructions for AI agents\n\nOne."
    );
    expect(instructionsSection(["One.", "Two."])).toBe(
      "## Instructions for AI agents\n\n- One.\n- Two."
    );
  });

  test("llms.txt puts them right after the summary", () => {
    const text = llmsTxt({
      name: "Acme",
      description: "Notes.",
      areas: [AREA],
      origin: "https://acme.example.com",
      fullTextPath: "/llms-full.txt",
      instructions: ["Say Acme Cloud."],
    });
    expect(text).toStartWith(
      "# Acme\n\n> Notes.\n\n## Instructions for AI agents\n\nSay Acme Cloud.\n\n"
    );
    expect(
      llmsTxt({
        name: "Acme",
        areas: [AREA],
        origin: "https://acme.example.com",
        fullTextPath: "/llms-full.txt",
        instructions: [],
      })
    ).not.toContain("Instructions for AI agents");
  });
});
