#!/usr/bin/env node
import { watch } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { validateSite } from "@notra/sites-compiler/validate";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import {
  listMountedAreas,
  normalizeSiteMounts,
} from "@notra/sites-core/utils/mounts";

import {
  buildSite,
  readBuildTarget,
  runAstro,
  writeBuildParams,
} from "./build";
import { USAGE } from "./constants/cli";
import { writeOgImages } from "./og-images";
import { prepareSite, readSiteFiles } from "./prepare";
import { siteHeadScripts } from "./utils/head-scripts";

const TOOLCHAIN_ROOT = fileURLToPath(new URL("..", import.meta.url));

function formatDiagnostic(diagnostic: SiteDiagnostic): string {
  const location = diagnostic.file
    ? `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}${diagnostic.column ? `:${diagnostic.column}` : ""}` : ""}`
    : "site";
  return `${diagnostic.severity === "error" ? "✖" : "⚠"} ${location}  ${diagnostic.message}`;
}

function printDiagnostics(diagnostics: SiteDiagnostic[]) {
  for (const diagnostic of diagnostics) {
    process.stderr.write(`${formatDiagnostic(diagnostic)}\n`);
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    options: {
      source: { type: "string", default: "." },
      target: { type: "string" },
      out: { type: "string" },
      area: { type: "string" },
      port: { type: "string", default: "4321" },
      json: { type: "boolean", default: false },
      "result-file": { type: "string" },
    },
  });
  const siteRoot = resolve(values.source ?? ".");

  if (command === "validate") {
    const { collected, files } = await readSiteFiles(siteRoot);
    const result = validateSite({ files });
    const diagnostics = [...collected.diagnostics, ...result.diagnostics];
    if (values.json) {
      process.stdout.write(
        `${JSON.stringify({ ok: result.ok, diagnostics, entries: result.entries }, null, 2)}\n`
      );
    } else {
      printDiagnostics(diagnostics);
      process.stderr.write(
        result.ok
          ? `✔ ${result.entries.length} entries, ${files.size} files look good\n`
          : "Validation failed\n"
      );
    }
    process.exit(result.ok ? 0 : 1);
  }

  if (command === "build") {
    if (!(values.target && values.out)) {
      throw new Error("build needs --target and --out");
    }
    const target = await readBuildTarget(values.target);
    const result = await buildSite({
      toolchainRoot: TOOLCHAIN_ROOT,
      siteRoot,
      target,
      outDir: resolve(values.out),
    });
    if (values["result-file"]) {
      await writeFile(values["result-file"], JSON.stringify(result));
    }
    if (values.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      printDiagnostics(result.diagnostics);
      process.stderr.write(
        result.ok
          ? `✔ Built ${result.areas.map((area) => `${area.area} at ${area.mount} (${area.durationMs} ms)`).join(", ")}: ${result.fileCount} files, ${(result.totalBytes / 1024).toFixed(0)} KB\n`
          : "Build failed\n"
      );
    }
    process.exit(result.ok ? 0 : 1);
  }

  if (command === "dev") {
    const workDir = join(TOOLCHAIN_ROOT, ".notra", "work");
    const prepare = async () => {
      const prepared = await prepareSite({
        siteRoot,
        workDir,
        stableAssetNames: true,
      });
      const config = prepared.validation.config;
      const ogImages =
        prepared.validation.ok && config
          ? await writeOgImages({
              workDir,
              config,
              entries: prepared.validation.entries,
              publicFiles: prepared.publicFiles,
              includeDrafts: true,
            })
          : null;
      printDiagnostics([
        ...prepared.collectDiagnostics,
        ...prepared.validation.diagnostics,
        ...(ogImages?.diagnostics ?? []),
      ]);
      return {
        ...prepared,
        publicFiles: [
          ...prepared.publicFiles,
          ...Object.values(ogImages?.manifest ?? {}),
        ],
      };
    };
    const prepared = await prepare();
    if (!(prepared.validation.ok && prepared.validation.config)) {
      process.exit(1);
    }
    const mounts = normalizeSiteMounts({
      blog: "/blog",
      changelog: "/changelog",
    });
    const mounted = listMountedAreas(mounts);
    const selected =
      mounted.find((entry) => entry.area === values.area) ?? mounted[0];
    if (!selected) {
      process.exit(1);
    }
    const paramsPath = join(workDir, "params.dev.json");
    await writeBuildParams(paramsPath, {
      area: selected.area,
      mount: selected.mount,
      publicOrigin: `http://localhost:${values.port}`,
      siteId: "local",
      deploymentId: "local",
      noindex: true,
      includeDrafts: true,
      branding: true,
      workDir,
      publicFiles: prepared.publicFiles,
      mounts,
      config: prepared.validation.config,
      headScripts: siteHeadScripts(
        prepared.validation.config,
        selected.mount,
        prepared.customScripts
      ),
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    watch(siteRoot, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        prepare().catch((error: unknown) =>
          process.stderr.write(`${String(error)}\n`)
        );
      }, 150);
    });
    process.stderr.write(
      `Previewing ${selected.area} at http://localhost:${values.port}${selected.mount}\n`
    );
    let devOutput = "";
    const exitCode = await runAstro(
      TOOLCHAIN_ROOT,
      "dev",
      paramsPath,
      ["--port", values.port ?? "4321"],
      (chunk) => {
        devOutput += chunk;
        process.stderr.write(chunk);
      }
    );
    if (exitCode === 0 && devOutput.includes("astro dev stop")) {
      const stop = async () => {
        await runAstro(
          TOOLCHAIN_ROOT,
          "stop",
          paramsPath,
          [],
          () => undefined
        ).catch(() => undefined);
        process.exit(0);
      };
      process.on("SIGINT", () => {
        stop().catch(() => process.exit(1));
      });
      process.on("SIGTERM", () => {
        stop().catch(() => process.exit(1));
      });
      await new Promise(() => undefined);
    }
    process.exit(exitCode);
  }

  process.stderr.write(`${USAGE}\n`);
  process.exit(command ? 1 : 0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exit(1);
});
