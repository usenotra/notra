import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { SiteInputFingerprintParams } from "@notra/sites-core/types/smart-deployments";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";
import { fingerprintSiteInputs } from "@notra/sites-core/utils/input-fingerprint";
import { isCollectedSiteSourcePath } from "@notra/sites-core/utils/source-files";

import { collectSiteSource } from "../compiler/collect";
import { prepareSite } from "../compiler/prepare";

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

test("ignored public assets are not staged, while consumed asset changes affect the fingerprint", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-smart-public-"));
  const siteRoot = join(root, "source");
  const workDir = join(root, "work");
  const defaultConfig = createDefaultSiteConfig("Synthetic");
  const input: SiteInputFingerprintParams = {
    tree: [
      {
        path: "public/logo.svg",
        type: "blob",
        mode: "100644",
        sha: "a".repeat(40),
        size: 4,
      },
      {
        path: "public/logo!.svg",
        type: "blob",
        mode: "100644",
        sha: "b".repeat(40),
        size: 4,
      },
    ],
    truncated: false,
    rootDirectory: "",
    repositoryId: "synthetic",
    target: {
      publicOrigin: "https://example.test",
      mounts: { blog: "/blog" },
      noindex: false,
      branding: true,
      defaultConfig,
    },
    includeDrafts: false,
    snapshotId: "snapshot-1",
    year: 2026,
  };
  try {
    await mkdir(join(siteRoot, "public"), { recursive: true });
    await writeFile(join(siteRoot, "public/logo.svg"), "logo");
    await writeFile(join(siteRoot, "public/logo!.svg"), "skip");
    const original = await fingerprintSiteInputs(input);
    expect(original).not.toBeNull();
    const prepared = await prepareSite({ siteRoot, workDir, defaultConfig });
    expect(prepared.validation.ok).toBe(true);
    expect(prepared.publicFiles).toEqual(["/logo.svg"]);
    expect(await readFile(join(workDir, "site/public/logo.svg"), "utf8")).toBe(
      "logo"
    );
    expect(
      await Bun.file(join(workDir, "site/public/logo!.svg")).exists()
    ).toBe(false);

    await writeFile(join(siteRoot, "public/logo!.svg"), "edit");
    input.tree = input.tree.map((file) =>
      file.path === "public/logo!.svg" ? { ...file, sha: "c".repeat(40) } : file
    );
    expect(await fingerprintSiteInputs(input)).toBe(original);
    expect(
      (await prepareSite({ siteRoot, workDir, defaultConfig })).publicFiles
    ).toEqual(["/logo.svg"]);
    expect(
      await Bun.file(join(workDir, "site/public/logo!.svg")).exists()
    ).toBe(false);

    await writeFile(join(siteRoot, "public/logo.svg"), "edit");
    input.tree = input.tree.map((file) =>
      file.path === "public/logo.svg" ? { ...file, sha: "d".repeat(40) } : file
    );
    expect(await fingerprintSiteInputs(input)).not.toBe(original);
    await prepareSite({ siteRoot, workDir, defaultConfig });
    expect(await readFile(join(workDir, "site/public/logo.svg"), "utf8")).toBe(
      "edit"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
