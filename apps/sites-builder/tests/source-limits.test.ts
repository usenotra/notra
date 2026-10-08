import { expect, spyOn, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import { buildSite } from "../compiler/build";
import { collectSiteSource } from "../compiler/collect";
import { prepareSite, readSiteFiles } from "../compiler/prepare";

test("collection stops inspecting files as soon as the file budget is exceeded", async () => {
  const root = await fs.mkdtemp(join(tmpdir(), "notra-file-budget-"));
  try {
    for (
      let offset = 0;
      offset < SITE_BUILD_LIMITS.maxSourceFiles + 20;
      offset += 100
    ) {
      await Promise.all(
        Array.from(
          {
            length: Math.min(
              100,
              SITE_BUILD_LIMITS.maxSourceFiles + 20 - offset
            ),
          },
          (_, index) =>
            fs.writeFile(join(root, `file-${offset + index}.css`), "")
        )
      );
    }
    const inspect = spyOn(fs, "lstat");
    try {
      const collected = await collectSiteSource(root);
      expect(collected.files.length).toBe(SITE_BUILD_LIMITS.maxSourceFiles);
      expect(collected.diagnostics.map((item) => item.code)).toEqual([
        "too_many_files",
      ]);
      expect(inspect).toHaveBeenCalledTimes(
        SITE_BUILD_LIMITS.maxSourceFiles + 1
      );
    } finally {
      inspect.mockRestore();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 30_000);

test("source errors stop content reads, staging and Astro before the byte budget is exceeded", async () => {
  const root = await fs.mkdtemp(join(tmpdir(), "notra-byte-budget-"));
  try {
    for (const mode of ["single", "aggregate"]) {
      const siteRoot = join(root, mode);
      const workDir = join(root, `work-${mode}`);
      const outDir = join(root, `out-${mode}`);
      await fs.mkdir(siteRoot);
      const count = mode === "single" ? 1 : 20;
      for (let index = 0; index < count; index++) {
        const file = await fs.open(join(siteRoot, `file-${index}.css`), "w");
        try {
          await file.truncate(
            SITE_BUILD_LIMITS.maxSingleFileBytes + (mode === "single" ? 1 : 0)
          );
        } finally {
          await file.close();
        }
      }
      const inspect = spyOn(fs, "lstat");
      const code = mode === "single" ? "file_too_large" : "source_too_large";
      try {
        const collected = await collectSiteSource(siteRoot);
        expect(collected.totalBytes).toBeLessThanOrEqual(
          SITE_BUILD_LIMITS.maxSourceBytes
        );
        expect(inspect.mock.calls.length).toBe(
          mode === "single"
            ? 1
            : Math.floor(
                SITE_BUILD_LIMITS.maxSourceBytes /
                  SITE_BUILD_LIMITS.maxSingleFileBytes
              ) + 1
        );
        expect(collected.diagnostics.map((item) => item.code)).toEqual([code]);
      } finally {
        inspect.mockRestore();
      }

      const read = spyOn(fs, "readFile").mockRejectedValue(
        new Error("Unexpected source read")
      );
      try {
        const source = await readSiteFiles(siteRoot);
        expect(source.files.size).toBe(0);
        const prepared = await prepareSite({
          siteRoot,
          workDir,
          defaultConfig: createDefaultSiteConfig("Empty is allowed"),
        });
        expect(prepared.validation.ok).toBe(false);
        expect(prepared.collectDiagnostics.map((item) => item.code)).toEqual([
          code,
        ]);
        const result = await buildSite({
          siteRoot,
          workDir,
          outDir,
          toolchainRoot: join(root, "nonexistent-toolchain"),
          target: siteBuildRequestSchema.parse({
            siteId: "site_limits",
            deploymentId: "dep_limits",
            publicOrigin: "https://example.com",
            mounts: { blog: "/blog" },
            defaultConfig: createDefaultSiteConfig("Empty is allowed"),
          }),
        });
        expect(result.ok).toBe(false);
        expect(result.diagnostics.map((item) => item.code)).toEqual([code]);
        expect(result.areas).toEqual([]);
        expect(read).not.toHaveBeenCalled();
        expect(await fs.readdir(root)).not.toContain(`work-${mode}`);
        expect(await fs.readdir(root)).not.toContain(`out-${mode}`);
      } finally {
        read.mockRestore();
      }
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
