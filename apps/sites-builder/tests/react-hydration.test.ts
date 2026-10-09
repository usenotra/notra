import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";

import { buildSite } from "../compiler/build";
import { listFiles } from "../compiler/utils/fs";
import { hasReactComponents } from "../compiler/utils/react";

test("React detection includes generated inline modules and JS snippets, not browser scripts", () => {
  for (const path of [
    "snippets/label.jsx",
    "snippets/label.js",
    "blog/post.mdx.notra-inline.jsx",
    "header.mdx.notra-inline.jsx",
    "slots/after-post.mdx.notra-inline.jsx",
  ]) {
    expect(hasReactComponents(new Map([[path, ""]]))).toBe(true);
  }
  expect(
    hasReactComponents(
      new Map([
        ["blog/post.mdx", "<Note>MDX</Note>"],
        ["script.js", ""],
        ["scripts/analytics.js", ""],
        ["analytics.js", ""],
        ["public/widget.js", ""],
      ])
    )
  ).toBe(false);
});

test("real builds skip unused React integration and keep static components out of client islands", async () => {
  const toolchainRoot = resolve(import.meta.dir, "..");
  const scratch = join(toolchainRoot, ".astro");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, "test-react-hydration-"));
  try {
    for (const mode of [
      "plain",
      "inline",
      "static",
      "default",
      "interactive",
    ]) {
      const siteRoot = join(root, mode, "source");
      const workDir = join(root, mode, "work");
      const outDir = join(root, mode, "out");
      await mkdir(join(siteRoot, "blog"), { recursive: true });
      await writeFile(
        join(siteRoot, "blog.json"),
        JSON.stringify({ name: "Hydration test" })
      );
      let body = "<Note>Native content</Note>";
      if (mode === "inline") {
        body =
          "export const Highlight = () => <mark>Inline label</mark>;\n\n<Highlight client:static />";
      } else if (mode !== "plain") {
        await mkdir(join(siteRoot, "snippets"));
        await mkdir(join(siteRoot, "slots"));
        await writeFile(
          join(siteRoot, "snippets/label.jsx"),
          "export const Label = ({children}) => <strong>{children}</strong>;"
        );
        const labelImport = 'import { Label } from "/snippets/label.jsx";';
        body = `${labelImport}\n\n<Label${mode === "default" ? "" : " client:static"}>Post label</Label>`;
        for (const file of [
          "header.mdx",
          "footer.mdx",
          "slots/after-post.mdx",
        ]) {
          await writeFile(
            join(siteRoot, file),
            `${labelImport}\n\n<Label client:static>${file}</Label>`
          );
        }
        await writeFile(
          join(siteRoot, "snippets/nested.mdx"),
          `${labelImport}\n\n<Label client:static>Nested label</Label>`
        );
        body += '\n\nimport Nested from "/snippets/nested.mdx";\n\n<Nested />';
        if (mode === "interactive") {
          body +=
            "\n\nexport const Counter = () => { const [n, setN] = useState(0); return <button onClick={() => setN(n + 1)}>Count: {n}</button>; };\n\n<Counter />\n\n<Counter client:visible />";
        }
      }
      await writeFile(
        join(siteRoot, "blog/post.mdx"),
        `---\ntitle: Hydration test\ndate: 2026-10-09\n---\n\n${body}\n`
      );
      const result = await buildSite({
        toolchainRoot,
        siteRoot,
        workDir,
        outDir,
        target: siteBuildRequestSchema.parse({
          siteId: "site_hydration",
          deploymentId: "dep_hydration",
          publicOrigin: "https://example.com",
          mounts: { blog: "/blog" },
        }),
      });
      expect(
        result.diagnostics.filter((item) => item.severity === "error")
      ).toEqual([]);
      expect(result.ok).toBe(true);
      const params = JSON.parse(
        await readFile(join(workDir, "params.blog.json"), "utf8")
      );
      expect(params.hasReactComponents).toBe(mode !== "plain");
      const html = await readFile(join(outDir, "blog/post/index.html"), "utf8");
      const index = await readFile(join(outDir, "blog/index.html"), "utf8");
      expect(index).not.toContain("<astro-island ");
      expect(index).not.toContain("renderer-url=");
      expect(html).not.toContain("client:static");
      if (mode === "plain") {
        expect(html).toContain("Native content");
        expect(
          (await listFiles(outDir)).filter((path) => path.endsWith(".js"))
        ).toEqual([]);
      } else if (mode === "inline") {
        expect(html).toContain("<mark>Inline label</mark>");
      } else {
        for (const content of [
          "Post label",
          "Nested label",
          "header.mdx",
          "footer.mdx",
          "slots/after-post.mdx",
        ]) {
          expect(html).toContain(content);
          if (mode !== "default" || content !== "Post label") {
            expect(html).toContain(`<strong>${content}</strong>`);
          }
        }
      }
      if (mode === "plain" || mode === "static" || mode === "inline") {
        expect(html).not.toContain("<astro-island ");
        expect(html).not.toContain("renderer-url=");
      } else {
        expect(html.match(/<astro-island\s/g)).toHaveLength(
          mode === "default" ? 1 : 2
        );
        expect(html).toContain('client="load"');
        expect(html).toContain("renderer-url=");
        if (mode === "interactive") {
          expect(html).toContain('client="visible"');
          expect(html).toContain("Count: <!-- -->0");
        }
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);
