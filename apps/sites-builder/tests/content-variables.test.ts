import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";

import { buildSite } from "../compiler/build";

test("real builds resolve site variables in content, links, snippets and metadata without modifying the source or old output", async () => {
  const toolchainRoot = resolve(import.meta.dir, "..");
  const scratch = join(toolchainRoot, ".astro");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, "variables-build-"));
  try {
    const siteRoot = join(root, "source");
    await Promise.all(
      ["blog", "changelog", "snippets"].map((path) =>
        mkdir(join(siteRoot, path), { recursive: true })
      )
    );
    const post =
      '---\ntitle: "Introducing {{ product_name }}"\ndescription: "Try {{ product_name }} today"\ndate: 2026-10-09\n---\n\nimport Cta from "/snippets/cta.mdx";\n\nWelcome to {{ product_name }}.\n\n<Cta />\n\n`{{ product_name }}`\n\n```text\n{{ product_name }}\n```\n\nUnknown {{ missing }}.\n';
    await writeFile(join(siteRoot, "blog/launch.mdx"), post);
    await writeFile(
      join(siteRoot, "snippets/cta.mdx"),
      'export const label = "{{ quoted_name }}";\n\n[Start {{ product_name }}]({{ signup_url }})\n\n{{ quoted_name }}\n\n<span>{"{{ quoted_name }}"}</span>\n'
    );
    await writeFile(
      join(siteRoot, "changelog/release.mdx"),
      '---\ntitle: "{{ product_name }} update"\ndate: 2026-10-09\nversion: "2.0"\n---\n\n{{ product_name }} shipped version 2.0.\n'
    );
    await writeFile(
      join(siteRoot, "footer.mdx"),
      "<footer>Contact {{ support_email }}</footer>\n"
    );
    const target = siteBuildRequestSchema.parse({
      siteId: "variables-test",
      deploymentId: "test",
      publicOrigin: "https://example.com",
      mounts: { blog: "/blog", changelog: "/changelog" },
    });
    for (const product of ["Acme Flow", "Acme Cloud"]) {
      const suffix = product === "Acme Flow" ? "first" : "second";
      await writeFile(
        join(siteRoot, "blog.json"),
        JSON.stringify({
          name: "Acme",
          variables: {
            product_name: product,
            signup_url: "https://example.com/signup",
            support_email: "help@example.com",
            quoted_name: 'Acme "Flow"',
          },
          blog: {},
          changelog: {},
          thumbnails: { enabled: false },
        })
      );
      const outDir = join(root, suffix);
      const result = await buildSite({
        toolchainRoot,
        siteRoot,
        workDir: join(root, `work-${suffix}`),
        outDir,
        target,
      });
      expect(
        result.diagnostics.filter((item) => item.severity === "error")
      ).toEqual([]);
      expect(result.ok).toBe(true);
      expect(
        result.diagnostics.some((item) => item.code === "variable_unknown")
      ).toBe(true);
      const html = await readFile(
        join(outDir, "blog/launch/index.html"),
        "utf8"
      );
      expect(html).toContain(`Introducing ${product}`);
      expect(html).toContain(`Welcome to ${product}`);
      expect(html).toContain(`Start ${product}`);
      expect(html).toContain('href="https://example.com/signup"');
      expect(html).toContain("help@example.com");
      expect(html).toContain("{{ product_name }}");
      expect(html).toContain("Unknown {{ missing }}");
      expect(html).toContain("{{ quoted_name }}");
      const stagedSnippet = await readFile(
        join(root, `work-${suffix}`, "site/snippets/cta.mdx"),
        "utf8"
      );
      expect(stagedSnippet).toContain(
        'export const label = "{{ quoted_name }}";'
      );
      expect(stagedSnippet).toContain('Acme "Flow"');
      const changelog = await readFile(
        join(outDir, "changelog/release/index.html"),
        "utf8"
      );
      expect(changelog).toContain(`${product} update`);
      expect(changelog).toContain("version 2.0");
      expect(await readFile(join(siteRoot, "blog/launch.mdx"), "utf8")).toBe(
        post
      );
    }
    const firstHtml = await readFile(
      join(root, "first/blog/launch/index.html"),
      "utf8"
    );
    expect(firstHtml).toContain("Welcome to Acme Flow");
    expect(firstHtml).not.toContain("Acme Cloud");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
