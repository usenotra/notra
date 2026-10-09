import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

import { hasErrors } from "@notra/sites-compiler/utils/diagnostics";
import { isTextSourceFile } from "@notra/sites-compiler/utils/paths";
import { validateSite } from "@notra/sites-compiler/validate";
import { SITE_AREAS, SITE_ASSETS_DIR } from "@notra/sites-core/constants/sites";
import { sortCustomScriptPaths } from "@notra/sites-core/utils/custom-scripts";
import { isSiteStylesheet } from "@notra/sites-core/utils/source-files";

import { collectSiteSource } from "./collect";
import type {
  PreparedSite,
  PrepareSiteParams,
  SiteFiles,
} from "./types/source";
import { writeFileEnsured } from "./utils/fs";

export async function readSiteFiles(siteRoot: string): Promise<SiteFiles> {
  const collected = await collectSiteSource(siteRoot);
  if (hasErrors(collected.diagnostics)) {
    return { collected, files: new Map() };
  }
  const texts = await Promise.all(
    collected.files.map((file) =>
      isTextSourceFile(file.path)
        ? readFile(join(siteRoot, file.path), "utf8")
        : null
    )
  );
  const files = new Map<string, string | null>(
    collected.files.map((file, index) => [file.path, texts[index] ?? null])
  );
  return { collected, files };
}

export async function prepareSite(
  params: PrepareSiteParams
): Promise<PreparedSite> {
  const { collected, files } = await readSiteFiles(params.siteRoot);
  if (hasErrors(collected.diagnostics)) {
    return {
      validation: {
        ok: false,
        config: null,
        diagnostics: [],
        entries: [],
        outputs: new Map(),
      },
      collectDiagnostics: collected.diagnostics,
      publicFiles: [],
      customScripts: [],
    };
  }
  const validation = validateSite({
    files,
    defaultConfig: params.defaultConfig,
  });
  const publicFiles = collected.files
    .filter((file) => file.path.startsWith("public/"))
    .map((file) => file.path.slice("public".length));

  if (!validation.ok) {
    return {
      validation,
      collectDiagnostics: collected.diagnostics,
      publicFiles,
      customScripts: [],
    };
  }

  await rm(join(params.workDir, "site"), { recursive: true, force: true });
  await rm(join(params.workDir, "entries"), { recursive: true, force: true });
  await Promise.all(
    SITE_AREAS.map((area) =>
      mkdir(join(params.workDir, "entries", area), { recursive: true })
    )
  );

  await Promise.all(
    collected.files.map(async (file) => {
      const target = join(params.workDir, "site", file.path);
      const transformed = validation.outputs.get(file.path);
      if (transformed !== undefined) {
        await writeFileEnsured(target, transformed);
        return;
      }
      await mkdir(dirname(target), { recursive: true });
      await cp(join(params.siteRoot, file.path), target);
    })
  );
  await Promise.all(
    [...validation.outputs]
      .filter(([path]) => !files.has(path))
      .map(([path, source]) =>
        writeFileEnsured(join(params.workDir, "site", path), source)
      )
  );

  const customCss = collected.files
    .filter((file) => isSiteStylesheet(file.path))
    .map(
      (file) =>
        `@import ${JSON.stringify(join(params.workDir, "site", file.path))};`
    )
    .join("\n");
  await writeFileEnsured(join(params.workDir, "custom.css"), `${customCss}\n`);

  await mkdir(join(params.workDir, "site", "public", SITE_ASSETS_DIR), {
    recursive: true,
  });
  const customScripts = await Promise.all(
    sortCustomScriptPaths(collected.files.map((file) => file.path)).map(
      async (path) => {
        const source = await readFile(join(params.siteRoot, path));
        const name = path
          .replace(/\.js$/i, "")
          .replace(/[^A-Za-z0-9_-]+/g, "-");
        const fileName = params.stableAssetNames
          ? `custom-${name}.js`
          : `custom-${name}.${createHash("sha256").update(source).digest("hex").slice(0, 10)}.js`;
        await cp(
          join(params.siteRoot, path),
          join(params.workDir, "site", "public", SITE_ASSETS_DIR, fileName)
        );
        return fileName;
      }
    )
  );

  await Promise.all(
    validation.entries.map((entry) =>
      writeFileEnsured(
        join(
          params.workDir,
          "entries",
          entry.area,
          `${entry.slug}.${entry.format}`
        ),
        validation.outputs.get(entry.path) ?? files.get(entry.path) ?? ""
      )
    )
  );
  return {
    validation,
    collectDiagnostics: collected.diagnostics,
    publicFiles,
    customScripts,
  };
}
