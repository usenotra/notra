import { describe, expect, test } from "bun:test";

import { findNewActiveContent } from "./github-mention-content-policy";

const reasons = (path: string, previous: string | null, next: string) =>
  findNewActiveContent({ path, previous, next }).map(
    (finding) => finding.reason
  );

describe("findNewActiveContent", () => {
  test("plain wording changes pass", () => {
    expect(
      reasons(
        "docs/changelog/release.mdx",
        "# Release\n\nWe shipped imports for CSV.",
        "# Release 2.4\n\nWe shipped faster imports for CSV.\n\n- export to PDF"
      )
    ).toEqual([]);
  });

  test("new MDX module code is blocked, existing lines stay editable", () => {
    const previous = 'import { Note } from "../note";\n\n# Release';
    expect(
      reasons("docs/release.mdx", previous, `${previous}\n\nShorter intro.`)
    ).toEqual([]);
    expect(
      reasons(
        "docs/release.mdx",
        previous,
        `${previous}\nimport fs from "node:fs";\nexport const leak = fs.readFileSync(".env");`
      )
    ).toEqual(["adds an MDX import or export", "adds an MDX import or export"]);
  });

  test("import at the start of a Markdown sentence is prose", () => {
    expect(
      reasons("docs/guide.md", "# Guide", "# Guide\n\nimport duties rose.")
    ).toEqual([]);
  });

  test("scripts, embeds, javascript URLs and handlers are blocked", () => {
    expect(
      reasons(
        "blog/post.md",
        "# Post",
        [
          "# Post",
          '<script src="https://evil.example/x.js"></script>',
          "<script",
          '<iframe src="https://evil.example">',
          "[click](javascript:alert(1))",
          '<img src="a.png"',
          '  onerror="fetch(1)" />',
        ].join("\n")
      )
    ).toEqual([
      "adds a script tag",
      "adds a script tag",
      "adds an embedded frame or object",
      "adds a javascript: URL",
      "adds an inline event handler",
    ]);
  });

  test("code samples are shown, not run", () => {
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        [
          "# Guide",
          "Use `import x from 'y'` or `<script>`.",
          "```ts",
          'import { notra } from "notra";',
          "export default notra;",
          "```",
          "~~~html",
          "<script>alert(1)</script>",
          "~~~",
        ].join("\n")
      )
    ).toEqual([]);
  });

  test("new MDX expressions are blocked unless they are literals", () => {
    const previous = "# Release\n\n<Stat value={stats.exports} />";
    expect(
      reasons(
        "docs/release.mdx",
        previous,
        [
          previous,
          "{/* reviewed (twice) */}",
          '<Image src="/a.png" width={600} style={{ maxWidth: "100%" }} />',
          '<Tabs items={["New", "Fixed"]} open={true} />',
          "Escaped \\{braces\\} and `{code}` are text.",
        ].join("\n")
      )
    ).toEqual([]);
    expect(
      findNewActiveContent({
        path: "docs/release.mdx",
        previous,
        next: [
          previous,
          "Key: {process.env.GITHUB_TOKEN}",
          "{(() => {",
          '  return fetch("https://evil.example");',
          "})()}",
          "<Stat value={`secret`} />",
        ].join("\n"),
      }).map((finding) => finding.line)
    ).toEqual([
      "{process.env.GITHUB_TOKEN}",
      '{(() => {\nreturn fetch("https://evil.example");\n})()}',
      "{`}",
    ]);
    expect(
      reasons("docs/guide.md", "# Guide", "# Guide\n\nUse {curly} braces.")
    ).toEqual([]);
  });

  test("a new file has no previous lines to lean on", () => {
    expect(
      reasons("docs/new.mdx", null, 'import x from "y";\n\n# New')
    ).toEqual(["adds an MDX import or export"]);
  });

  test("data and text files are not markup", () => {
    expect(
      reasons("content/authors.json", null, '{"bio":"<script>x</script>"}')
    ).toEqual([]);
  });
});
