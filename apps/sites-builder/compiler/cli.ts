#!/usr/bin/env node
import { watch } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import type { SiteDiagnostic } from "@notra/sites-compiler/types/diagnostics";
import { validateSite } from "@notra/sites-compiler/validate";
import {
  listMountedAreas,
  normalizeSiteMounts,
} from "@notra/sites-core/utils/mounts";

import { buildSite, readBuildTarget, runAstro } from "./build";
import { prepareSite, readSiteFiles } from "./prepare";

const TOOLCHAIN_ROOT = fileURLToPath(new URL("..", import.meta.url));
const USAGE = `notra-sites <command>

  validate [--source <dir>] [--json]        Check notra.json, MDX and snippets
  build --source <dir> --target <file> --out <dir> [--json]
  dev [--source <dir>] [--area blog|changelog] [--port 4321]`;

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
    // Same toolchain and theme as production; previews one area at a time.
    const workDir = join(TOOLCHAIN_ROOT, ".notra", "work");
    const prepare = async () => {
      const prepared = await prepareSite({ siteRoot, workDir });
      printDiagnostics([
        ...prepared.collectDiagnostics,
        ...prepared.validation.diagnostics,
      ]);
      return prepared;
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
    await writeFile(
      paramsPath,
      JSON.stringify({
        area: selected.area,
        mount: selected.mount,
        publicOrigin: `http://localhost:${values.port}`,
        siteId: "local",
        deploymentId: "local",
        noindex: true,
        includeDrafts: true,
        workDir,
        publicFiles: prepared.publicFiles,
        mounts,
        config: prepared.validation.config,
      })
    );
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
    // Outside an interactive terminal Astro starts the dev server in the background and
    // returns. Keep watching the source and stop that server when this command stops.
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
