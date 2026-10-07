import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import { buildSite } from "../compiler/build";
import { prepareSite, readSiteFiles } from "../compiler/prepare";

test("prepare stages a virtual config but leaves an empty source untouched", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-default-prepare-"));
  try {
    const siteRoot = join(root, "source");
    const workDir = join(root, "work");
    await mkdir(siteRoot);
    const defaultConfig = createDefaultSiteConfig("Frozen name");
    const snapshot = JSON.stringify(defaultConfig);
    const prepared = await prepareSite({ siteRoot, workDir, defaultConfig });

    expect(prepared.validation.ok).toBe(true);
    expect(prepared.validation.entries).toEqual([]);
    expect(await readFile(join(workDir, "site/blog.json"), "utf8")).toBe(
      JSON.stringify(prepared.validation.config)
    );
    expect(await readdir(siteRoot)).toEqual([]);
    expect(await readdir(join(workDir, "entries/blog"))).toEqual([]);
    expect(await readdir(join(workDir, "entries/changelog"))).toEqual([]);
    expect(JSON.stringify(defaultConfig)).toBe(snapshot);

    const legacy = await prepareSite({ siteRoot, workDir });
    expect(legacy.validation.ok).toBe(false);
    expect(legacy.validation.diagnostics.map((item) => item.code)).toContain(
      "config_missing"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("real fixture and empty-source builds use snapshot config without adding source files", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-default-build-"));
  const toolchainRoot = resolve(import.meta.dir, "..");
  try {
    for (const source of ["fixture", "empty"]) {
      const siteRoot = join(root, source);
      const workDir = join(root, `work-${source}`);
      const outDir = join(root, `out-${source}`);
      if (source === "fixture") {
        await cp(join(toolchainRoot, "fixtures/acme"), siteRoot, {
          recursive: true,
          filter: (path) =>
            path !== join(toolchainRoot, "fixtures/acme/blog.json"),
        });
      } else {
        await mkdir(siteRoot);
      }
      const before = (await readdir(siteRoot, { recursive: true })).sort();
      const sourceFiles = (await readSiteFiles(siteRoot)).collected.files;
      const sourceBytes = await Promise.all(
        sourceFiles.map((file) => readFile(join(siteRoot, file.path)))
      );
      const defaultConfig = createDefaultSiteConfig("Frozen build name");
      defaultConfig.errors[404] = {
        title: "Missing page",
        description: "Choose an existing page.",
        redirect: true,
      };
      const snapshot = JSON.stringify(defaultConfig);
      const target = siteBuildRequestSchema.parse({
        siteId: "site_defaults",
        deploymentId: "dep_defaults",
        publicOrigin: "https://example.com",
        mounts: { blog: "/blog", changelog: "/changelog" },
        defaultConfig,
      });
      const result = await buildSite({
        toolchainRoot,
        siteRoot,
        workDir,
        outDir,
        target,
      });

      expect(
        result.diagnostics.filter((item) => item.severity === "error")
      ).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.areas.map((item) => item.area)).toEqual([
        "blog",
        "changelog",
      ]);
      for (const area of ["blog", "changelog"]) {
        const html = await readFile(join(outDir, area, "index.html"), "utf8");
        expect(html).toContain("Frozen build name");
        const markdown404 = await readFile(
          join(outDir, area, "404.md"),
          "utf8"
        );
        expect(markdown404).toStartWith(
          "# Missing page\n\nChoose an existing page."
        );
        expect(markdown404).toContain(`(/${area}/index.md)`);
        expect(markdown404).toContain(`(/${area}/llms.txt)`);
        for (const map of [
          "index.md",
          "llms.txt",
          "llms-full.txt",
          "sitemap.xml",
          "feed.xml",
        ]) {
          expect(await readFile(join(outDir, area, map), "utf8")).not.toContain(
            "404.md"
          );
        }
        if (source === "empty") {
          expect(await readdir(join(workDir, "entries", area))).toEqual([]);
        }
      }
      expect((await readdir(siteRoot, { recursive: true })).sort()).toEqual(
        before
      );
      expect(
        await Promise.all(
          sourceFiles.map((file) => readFile(join(siteRoot, file.path)))
        )
      ).toEqual(sourceBytes);
      expect(before).not.toContain("blog.json");
      expect(JSON.stringify(defaultConfig)).toBe(snapshot);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);
