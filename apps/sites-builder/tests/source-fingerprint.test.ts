import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { isCollectedSiteSourcePath } from "@notra/sites-core/utils/source-files";

import { collectSiteSource } from "../compiler/collect";

test("fingerprint path selection matches the real compiler collector", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-smart-source-"));
  const paths = [
    "blog/post.mdx",
    "blog/a b.md",
    "blog/é.mdx",
    "snippets/component.jsx",
    "src/backend.js",
    "src/theme.CSS",
    "public/font.woff2",
    "public/image.bmp",
    "header.mdx",
    "footer.mdx",
    "slots/blog/sidebar.mdx",
    ".hidden/global.css",
    "node_modules/library/index.js",
    "src/.hidden/a.js",
    "README.md",
    "package.json",
    "blog/post.mdx.backup",
  ];
  try {
    for (const path of paths) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), "Synthetic source");
    }
    const source = await collectSiteSource(root);
    expect(source.files.map((file) => file.path).sort()).toEqual(
      paths.filter(isCollectedSiteSourcePath).sort()
    );
    expect(
      source.diagnostics.every((diagnostic) => diagnostic.severity !== "error")
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
