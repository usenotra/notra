import { describe, expect, test } from "bun:test";

import { validateSite } from "../src/validate";

const CONFIG = JSON.stringify({ name: "Acme" });
const post = (body: string, frontmatter = "title: Hello\ndate: 2026-10-01") =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

function run(files: Record<string, string | null>) {
  return validateSite({
    files: new Map(Object.entries({ "notra.json": CONFIG, ...files })),
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
  test("Mintlify-style snippets, inline components and built-ins compile", () => {
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
          "notra.json": '{"name": ""}',
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
