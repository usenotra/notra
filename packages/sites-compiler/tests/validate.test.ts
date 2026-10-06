import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { validateSite } from "../src/validate";

const DOCS_BUTTON_SNIPPET = new URL(
  "../../../apps/docs/snippets/button.jsx",
  import.meta.url
);
const CONFIG = JSON.stringify({ name: "Acme" });
const post = (body: string, frontmatter = "title: Hello\ndate: 2026-10-01") =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

function run(files: Record<string, string | null>) {
  return validateSite({
    files: new Map(Object.entries({ "blog.json": CONFIG, ...files })),
  });
}

const errors = (result: ReturnType<typeof run>) =>
  result.diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map(
      (diagnostic) =>
        `${diagnostic.file}:${diagnostic.line ?? ""} ${diagnostic.code}`
    );

describe("site contract", () => {
  test("a docs button snippet works as written in the docs repo", () => {
    const button = readFileSync(DOCS_BUTTON_SNIPPET, "utf8");
    const result = run({
      "snippets/button.jsx": button,
      "blog/launch.mdx": post(
        [
          'import { DocsButton } from "/snippets/button.jsx"',
          "",
          '<DocsButton href="https://app.usenotra.com">Open dashboard</DocsButton>',
          '<DocsButton href="/quickstart" variant="outline">Get started</DocsButton>',
        ].join("\n")
      ),
    });
    expect(errors(result)).toEqual([]);
    expect(result.outputs.get("blog/launch.mdx")).toContain(
      'from "@site/snippets/button.jsx"'
    );
  });

  test("snippets, inline components and built-ins compile", () => {
    const result = run({
      "snippets/counter.jsx":
        "export const Counter = () => { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>{n}</button>; };",
      "snippets/install.mdx": "Install **{packageName}**.",
      "snippets/vars.mdx": 'export const company = "Acme";',
      "blog/launch.mdx": post(
        [
          'import { Counter } from "/snippets/counter.jsx";',
          'import Install from "../snippets/install.mdx";',
          'import { company } from "/snippets/vars.mdx";',
          "",
          "export const Toggle = () => { const [on, setOn] = useState(false); return <b onClick={() => setOn(!on)}>{String(on)}</b>; };",
          "",
          '{company} ships. <Counter /> <Toggle /> <Install packageName="acme" />',
          "",
          "<Note>Built-in</Note>",
        ].join("\n")
      ),
    });
    expect(errors(result)).toEqual([]);
    const launch = result.outputs.get("blog/launch.mdx") ?? "";
    expect(launch).toContain('from "@site/snippets/counter.jsx"');
    expect(launch).toContain("<Counter client:load />");
    expect(launch).toContain("<Toggle client:load />");
    expect(launch).toContain('import { Note } from "@notra/builtins"');
    expect(launch).not.toContain("export const Toggle");
    expect(result.outputs.get("blog/launch.mdx.notra-inline.jsx")).toContain(
      'import { useState } from "react"'
    );
    expect(result.outputs.get("snippets/install.mdx")).toContain(
      "{props.packageName}"
    );
    expect(result.outputs.get("snippets/counter.jsx")).toStartWith(
      'import { useState } from "react";'
    );
    expect(
      result.entries.map((entry) => `${entry.area}:${entry.slug}`)
    ).toEqual(["blog:launch"]);
  });

  test("rejects what the contract forbids, with file and line", () => {
    const result = run({
      "snippets/bad.jsx":
        'import x from "lodash";\nexport default () => null;\nexport const A = () => process.env.SECRET;',
      "snippets/nested.jsx":
        'import { A } from "./bad.jsx";\nexport const B = () => <A />;',
      "blog/post.mdx": post(
        'import data from "./data.json";\nimport { Missing } from "/snippets/bad.jsx";\n\n<Unknown />\n\n{import("x")}'
      ),
    });
    expect(errors(result)).toEqual(
      expect.arrayContaining([
        "snippets/bad.jsx:1 snippet_import",
        "snippets/bad.jsx:2 default_export",
        "snippets/bad.jsx:3 forbidden_syntax",
        "snippets/nested.jsx:1 snippet_import",
        "blog/post.mdx:6 import",
        "blog/post.mdx:7 missing_export",
        "blog/post.mdx:9 unknown_component",
        "blog/post.mdx:11 forbidden_syntax",
      ])
    );
    expect(result.ok).toBe(false);
  });

  test("inline components cannot use build-time imports", () => {
    const result = run({
      "snippets/vars.mdx": 'export const name = "x";',
      "blog/post.mdx": post(
        'import { name } from "/snippets/vars.mdx";\n\nexport const Hi = () => <b>{name}</b>;\n\n<Hi />'
      ),
    });
    expect(errors(result)).toContain("blog/post.mdx:8 inline_uses_import");
  });

  test("frontmatter, slugs, cycles and the config are checked", () => {
    const result = validateSite({
      files: new Map(
        Object.entries({
          "blog.json": '{"name": ""}',
          "blog/No Spaces.mdx": post("x"),
          "blog/missing.mdx": "no frontmatter",
          "changelog/bad-date.mdx": post("x", "title: A\ndate: not-a-date"),
          "snippets/a.mdx": 'import B from "/snippets/b.mdx";\n\n<B />',
          "snippets/b.mdx": 'import A from "/snippets/a.mdx";\n\n<A />',
        })
      ),
    });
    const codes = new Set(
      result.diagnostics.map((diagnostic) => diagnostic.code)
    );
    for (const code of [
      "config_invalid",
      "slug_invalid",
      "frontmatter_missing",
      "frontmatter_invalid",
      "import_cycle",
    ]) {
      expect(codes.has(code)).toBe(true);
    }
  });

  test("a file another file imports is a snippet, not a page", () => {
    const result = run({
      "blog/_partial.mdx": "Shared",
      "blog/shared.mdx": "Also shared",
      "blog/post.mdx": post('import Shared from "./shared.mdx";\n\n<Shared />'),
    });
    expect(result.entries.map((entry) => entry.slug)).toEqual(["post"]);
  });
});

describe("custom scripts", () => {
  test("script.js and scripts/*.js are browser scripts, not snippets", () => {
    const result = run({
      "script.js": "window.dataLayer = window.dataLayer || [];",
      "scripts/chat.js":
        "document.addEventListener('DOMContentLoaded', () => {});",
      "scripts/broken.js": "const a = ;",
      "blog/post.mdx": post('import { X } from "/scripts/chat.js";\n\n<X />'),
    });
    expect(errors(result)).toEqual(
      expect.arrayContaining([
        "scripts/broken.js:1 script_syntax",
        "blog/post.mdx:6 import",
      ])
    );
    expect(errors(result)).not.toContain("script.js:1 script_syntax");
    expect(result.outputs.has("scripts/chat.js")).toBe(false);
  });
});

describe("header, footer and slots", () => {
  test("compile like snippets, so the theme's props resolve", () => {
    const result = run({
      "snippets/counter.jsx": "export const Counter = () => <b>1</b>;",
      "header.mdx":
        'import { Counter } from "/snippets/counter.jsx";\n\n<nav className="flex gap-4"><a href="/">{site.name}</a> <Counter /></nav>',
      "footer.mdx": "<Note>© Acme</Note>",
      "slots/after-post.mdx":
        '<div className="rounded border p-4">Liked **{post.title}**? Read more in {area}.</div>',
      "blog/post.mdx": post("Hi"),
    });
    expect(errors(result)).toEqual([]);
    expect(result.outputs.get("header.mdx")).toContain("{props.site.name}");
    expect(result.outputs.get("header.mdx")).toContain(
      'from "@site/snippets/counter.jsx"'
    );
    expect(result.outputs.get("header.mdx")).toContain(
      "<Counter client:load />"
    );
    expect(result.outputs.get("footer.mdx")).toContain(
      'import { Note } from "@notra/builtins"'
    );
    expect(result.outputs.get("slots/after-post.mdx")).toContain(
      "{props.post.title}"
    );
    expect(result.entries.map((entry) => entry.path)).toEqual([
      "blog/post.mdx",
    ]);
  });

  test("unknown slot files are errors that list the valid names", () => {
    const result = run({
      "slots/after-posts.mdx": "Typo",
      "slots/sidebar.jsx": "export const A = () => null;",
      "blog/post.mdx": post("Hi"),
    });
    expect(errors(result)).toEqual([
      "slots/after-posts.mdx: slot_unknown",
      "slots/sidebar.jsx: slot_unknown",
    ]);
    const message =
      result.diagnostics.find(
        (diagnostic) => diagnostic.code === "slot_unknown"
      )?.message ?? "";
    expect(message).toContain("after-post.mdx");
    expect(message).toContain("blog-hero.mdx");
  });
});

describe("variables", () => {
  const withVariables = (files: Record<string, string>) =>
    validateSite({
      files: new Map(
        Object.entries({
          "blog.json": JSON.stringify({
            name: "Acme",
            variables: { product: "Acme Cloud", version: "2.1" },
          }),
          ...files,
        })
      ),
    });

  test("are replaced in entries, chrome and slots, but not in snippets", () => {
    const result = withVariables({
      "blog/post.mdx": post("Try {{ product }} {{version}}."),
      "blog/plain.md": post("{{ product }} in Markdown."),
      "footer.mdx": "© {{ product }}",
      "slots/after-post.mdx": "Get {{ product }}",
      "snippets/x.mdx": "{{ product }}",
    });
    expect(errors(result)).toEqual([]);
    expect(result.outputs.get("blog/post.mdx")).toContain(
      "Try Acme Cloud 2.1."
    );
    expect(result.outputs.get("blog/plain.md")).toContain(
      "Acme Cloud in Markdown."
    );
    expect(result.outputs.get("footer.mdx")).toContain("© Acme Cloud");
    expect(result.outputs.get("slots/after-post.mdx")).toContain(
      "Get Acme Cloud"
    );
    expect(result.outputs.has("snippets/x.mdx")).toBe(true);
    expect(result.outputs.get("snippets/x.mdx")).not.toContain("Acme Cloud");
  });

  test("unknown names are warnings and stay literal text", () => {
    const result = withVariables({
      "blog/post.mdx": post("Hello {{ missing }}."),
    });
    expect(result.ok).toBe(true);
    expect(
      result.diagnostics.map(
        (diagnostic) =>
          `${diagnostic.severity} ${diagnostic.file}:${diagnostic.line} ${diagnostic.code}`
      )
    ).toEqual(["warning blog/post.mdx:6 variable_unknown"]);
    expect(result.outputs.get("blog/post.mdx")).toContain(
      "Hello \\{\\{ missing \\}\\}."
    );
  });
});

describe("content safety and config checks", () => {
  const config = JSON.stringify({ name: "Acme" });
  const post = (body: string) =>
    `---\ntitle: T\ndate: 2026-01-01\n---\n\n${body}\n`;

  test("rejects <script> in MDX, Markdown and chrome files", () => {
    for (const [path, body] of [
      ["blog/a.mdx", post("<script>alert(1)</script>")],
      ["blog/b.md", post("<script>alert(1)</script>")],
      ["header.mdx", "<header><script>alert(1)</script></header>"],
    ] as const) {
      const result = validateSite({
        files: new Map([
          ["blog.json", config],
          [path, body],
        ]),
      });
      expect(result.diagnostics.some((d) => d.code === "blocked_element")).toBe(
        true
      );
    }
  });

  test("keeps script tags inside code blocks", () => {
    const result = validateSite({
      files: new Map([
        ["blog.json", config],
        ["blog/a.md", post("```html\n<script>x</script>\n```")],
      ]),
    });
    expect(result.ok).toBe(true);
  });

  test("warns about unknown settings with a suggestion", () => {
    const result = validateSite({
      files: new Map([
        ["blog.json", JSON.stringify({ name: "Acme", navBar: {} })],
        ["blog/a.md", post("Hi")],
      ]),
    });
    const warning = result.diagnostics.find(
      (d) => d.code === "config_unknown_key"
    );
    expect(warning?.message).toContain('Did you mean "navbar"?');
    expect(result.ok).toBe(true);
  });

  test("warns about featured slugs without a post", () => {
    const result = validateSite({
      files: new Map([
        [
          "blog.json",
          JSON.stringify({
            name: "Acme",
            blog: { featured: ["a", "missing"] },
          }),
        ],
        ["blog/a.md", post("Hi")],
      ]),
    });
    expect(
      result.diagnostics.filter((d) => d.code === "featured_unknown")
    ).toHaveLength(1);
  });
});
