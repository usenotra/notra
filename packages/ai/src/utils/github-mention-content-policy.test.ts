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
    ).toEqual(["adds an MDX import or export"]);
  });

  test("the MDX parser decides whether comment-separated text is a module", () => {
    const previous = 'import { Note } from "../note";\n\n# Release';
    expect(
      reasons(
        "docs/release.mdx",
        previous,
        `${previous}\n\nexport/**/const leak = process.env.GITHUB_TOKEN;`
      )
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
      // The incomplete second script owns the following HTML according to the
      // parser. Either finding blocks the complete edit.
    ).toEqual(["adds a script tag", "adds a script tag"]);
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

  test("active content moved out of inert context is blocked", () => {
    expect(
      reasons(
        "docs/guide.mdx",
        "```html\n<script>alert(1)</script>\n```\n\n```js\nexport const run = true;\n```",
        "<script>alert(1)</script>\n\nexport const run = true;"
      )
    ).toEqual(["adds a script tag", "adds an MDX import or export"]);
  });

  test("fence-looking lines inside raw HTML cannot hide active content", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        "# Guide\n<div>\n```html\n<script>alert(1)</script>\n```\n</div>"
      )
    ).toEqual(["adds a script tag"]);
  });

  test("HTML-looking code samples do not hide content after their fence", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        "# Guide\n```html\n<div>\n```\n<script>alert(1)</script>"
      )
    ).toEqual(["adds a script tag"]);
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

  test("HTML comment activity follows the HTML parser", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide\n<!-<!--\n<script>alert(1)</script>\n-->- -->",
        "# Guide\n<script>alert(1)</script>"
      )
    ).toEqual([]);
    expect(
      reasons(
        "docs/guide.md",
        "# Guide\n<!--\n<script>alert(1)</script>",
        "# Guide\n<script>alert(1)</script>"
      )
    ).toEqual(["adds a script tag"]);
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

  test("reference definitions cannot hide javascript URLs", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        "# Guide\n\n[open][target]\n\n[target]: javascript:alert(1)"
      )
    ).toEqual(["adds a javascript: URL"]);
  });

  test("raw SVG and adjacent inline HTML nodes are inspected", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        '# Guide\n\n<svg><a href="javascript:alert(1)">x</a><script>alert(1)</script></svg>'
      )
    ).toEqual(["adds a javascript: URL", "adds a script tag"]);
  });

  test("edits to an existing inline script body are blocked", () => {
    expect(
      reasons(
        "docs/guide.md",
        "Hello <script>console.log(1)</script> world.",
        "Hello <script>alert(document.cookie)</script> world."
      )
    ).toEqual(["adds a script tag"]);
    expect(
      reasons(
        "docs/guide.md",
        "<div><script>safe()</script></div>",
        "<section><script>unsafe()</script></section>"
      )
    ).toEqual(["adds a script tag"]);
    expect(
      reasons(
        "docs/guide.md",
        "<script>safe()</script>\n\nOld unrelated prose.",
        "<script>safe()</script>\n\nNew unrelated prose."
      )
    ).toEqual([]);
  });

  test("normalized HTML and literal MDX javascript URLs are blocked", () => {
    expect(
      reasons(
        "docs/guide.md",
        "# Guide",
        '# Guide\n\n<svg><a xlink:href="javascript:alert(1)">click</a></svg>'
      )
    ).toEqual(["adds a javascript: URL"]);
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        '# Guide\n\n<a href={"javascript:alert(1)"}>click</a>'
      )
    ).toEqual(["adds a javascript: URL"]);
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        '# Guide\n\n<a href={"https://example.com"}>click</a>'
      )
    ).toEqual([]);
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
    ).toEqual(["adds an MDX expression", "adds an MDX expression"]);
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
      '{(() => {\n  return fetch("https://evil.example");\n})()}',
      "<Stat value={`secret`} />",
    ]);
    expect(
      reasons("docs/guide.md", "# Guide", "# Guide\n\nUse {curly} braces.")
    ).toEqual([]);
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        '# Guide\n\nValues: {42}, {true}, {null}, and {"text"}.\n\n<span title={"safe"}>ok</span>'
      )
    ).toEqual([]);
  });

  test("parses standalone unsafe HTML and multiline attributes", () => {
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        '# Guide\n\n<iframe src="https://evil.example"></iframe>\n\n<img\n src="x"\n onerror="alert(1)"\n/>'
      )
    ).toEqual([
      "adds an embedded frame or object",
      "adds an inline event handler",
    ]);
  });

  test("parses multiline modules and rejects malformed MDX", () => {
    expect(
      reasons(
        "docs/guide.mdx",
        "# Guide",
        'import {\n  Note,\n  Warning\n} from "../components"\n\n# Guide'
      )
    ).toEqual(["adds an MDX import or export"]);
    expect(
      reasons("docs/guide.mdx", "# Guide", "# Guide\n\n<Value x={")
    ).toEqual(["cannot safely parse edited markup"]);
  });

  test("prose can change around exact existing executable constructs", () => {
    const executable = [
      'import { Note } from "../note"',
      "",
      "<Note value={account.name}>Keep this component.</Note>",
    ].join("\n");
    expect(
      reasons(
        "docs/guide.mdx",
        `Old prose.\n\n${executable}`,
        `New prose with more detail.\n\n${executable}`
      )
    ).toEqual([]);
  });

  test("SVG mutation elements cannot introduce active URL assignments", () => {
    for (const extension of ["md", "mdx"]) {
      for (const tag of ["animate", "set"]) {
        const markup = `<svg><a><${tag} attributeName="href" values="safe;javascript:alert(1)" begin="0s" fill="freeze" /><text x="20" y="20">click</text></a></svg>`;
        expect(reasons(`docs/page.${extension}`, "# Page", markup)).toContain(
          "adds an embedded frame or object"
        );
        expect(reasons(`docs/page.${extension}`, markup, markup)).toEqual([]);
      }
    }
  });

  test("existing constructs may move but not multiply", () => {
    const construct = '<script src="/trusted.js"></script>';
    expect(
      reasons(
        "docs/guide.md",
        `Before.\n\n${construct}`,
        `${construct}\n\nAfter.`
      )
    ).toEqual([]);
    expect(
      reasons("docs/guide.md", construct, `${construct}\n\n${construct}`)
    ).toEqual(["adds a script tag"]);
  });
});
