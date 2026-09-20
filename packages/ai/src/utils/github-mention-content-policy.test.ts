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

  test("uncommenting active markup is blocked", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide\n<!--\n<script>alert(1)</script>\n-->",
        "# Guide\n<script>alert(1)</script>"
      )
    ).toEqual(["adds a script tag"]);
  });

  test("nested and unterminated comments in the old file make nothing known", () => {
    for (const previous of [
      "# Guide\n<!-<!--\n<script>alert(1)</script>\n-->- -->",
      "# Guide\n<!--\n<script>alert(1)</script>",
    ]) {
      expect(
        reasons("docs/guide.md", previous, "# Guide\n<script>alert(1)</script>")
      ).toEqual(["adds a script tag"]);
    }
  });

  test("encoded javascript URLs and unquoted handlers are blocked", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        [
          "# Guide",
          "[numeric](java&#x73;cript&#58;alert(1))",
          "[percent](java%73cript%3Aalert(1))",
          "[percent with invalid escape](java%73cript:alert(1)%ZZ)",
          "[double encoded](java%2573cript%253Aalert(1))",
          "[named](javascript&colon;alert(1))",
          "[control](java&#x09;script:alert(1))",
          "<img src=x onerror=alert(1)>",
        ].join("\n")
      )
    ).toEqual([
      "adds a javascript: URL",
      "adds a javascript: URL",
      "adds a javascript: URL",
      "adds a javascript: URL",
      "adds a javascript: URL",
      "adds a javascript: URL",
      "adds an inline event handler",
    ]);
  });

  test("comment markers inside an attribute do not hide active content", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        [
          "# Guide",
          '<img title="<!--" onerror=alert(1) alt="-->">',
          '<a title="<!--" href="javascript:alert(1)" rel="-->">x</a>',
        ].join("\n")
      )
    ).toEqual(["adds an inline event handler", "adds a javascript: URL"]);
  });

  test("a handler only counts inside a tag", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        [
          "# Guide",
          "Set onboarding=true in the URL.",
          "Once the timeout = 5, retries stop.",
          "Use a < b and onward = c.",
        ].join("\n")
      )
    ).toEqual([]);
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        [
          "# Guide",
          '<img title="a > b"',
          "  src=x",
          "  onerror=alert(1)",
          ">",
        ].join("\n")
      )
    ).toEqual(["adds an inline event handler"]);
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
});
