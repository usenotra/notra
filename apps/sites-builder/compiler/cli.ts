#!/usr/bin/env node
import { renameSync, watch } from "node:fs";
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

import { buildSite, readBuildTarget, writeBuildParams } from "./build";
import { USAGE } from "./constants/cli";
import {
  findFreePort,
  paramsForArea,
  startAstroDev,
  startDevProxy,
  stopAstroDev,
} from "./dev-server";
import { writeOgImages } from "./og-images";
import { prepareSite, readSiteFiles } from "./prepare";
import type { DevAreaServer, RunningDevArea } from "./types/dev-server";
import { createDevRefresh } from "./utils/dev-refresh";

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
    const mounts = normalizeSiteMounts({
      blog: "/blog",
      changelog: "/changelog",
    });
    const port = Number(values.port ?? "4321");
    const mounted = listMountedAreas(mounts);
    const areas: DevAreaServer[] = [];
    let nextPort = port + 1;
    for (const entry of mounted) {
      // Sequential on purpose: each search starts after the last port taken.
      const areaPort = await findFreePort(nextPort);
      nextPort = areaPort + 1;
      areas.push({
        ...entry,
        port: areaPort,
        paramsPath: join(workDir, `params.dev.${entry.area}.json`),
      });
    }
    const selected =
      areas.find((entry) => entry.area === values.area) ?? areas[0];
    if (!selected) {
      process.exit(1);
    }
    const ordered = [selected, ...areas.filter((area) => area !== selected)];
    let running: RunningDevArea[] = [];
    const stopAreas = async () => {
      const stopping = running;
      running = [];
      await Promise.all(stopping.map(stopAstroDev));
    };
    const refresh = createDevRefresh({
      params: {
        area: selected.area,
        mount: selected.mount,
        publicOrigin: `http://localhost:${port}`,
        siteId: "local",
        deploymentId: "local",
        noindex: true,
        includeDrafts: true,
        branding: true,
        workDir,
        mounts,
      },
      prepare: () => prepareSite({ siteRoot, workDir, stableAssetNames: true }),
      writeOgImages,
      printDiagnostics,
      reportError: (error) => process.stderr.write(`${String(error)}\n`),
      publish: async (params, isCurrent) => {
        for (const area of areas) {
          const temporaryPath = `${area.paramsPath}.tmp`;
          await writeBuildParams(temporaryPath, paramsForArea(params, area));
          if (!isCurrent()) {
            return false;
          }
          renameSync(temporaryPath, area.paramsPath);
        }
        return true;
      },
      runAstro: async (astroCommand) => {
        await stopAreas();
        if (astroCommand === "stop") {
          return 0;
        }
        const started = await Promise.all(
          areas.map((area) => startAstroDev(TOOLCHAIN_ROOT, area))
        );
        running = started.filter(
          (entry): entry is RunningDevArea => entry !== null
        );
        if (running.length !== areas.length) {
          await stopAreas();
          return 1;
        }
        return 0;
      },
    });
    const proxy = await startDevProxy(port, mounts, ordered);
    let watchedRefresh: Promise<boolean> | undefined;
    const watcher = watch(siteRoot, { recursive: true }, () => {
      const requested = refresh.refresh(150);
      if (requested !== watchedRefresh) {
        watchedRefresh = requested;
        requested.catch((error: unknown) =>
          process.stderr.write(`${String(error)}\n`)
        );
      }
    });
    const stop = async () => {
      watcher.close();
      proxy.close();
      await refresh.shutdown();
    };
    const onSignal = () => {
      stop()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          process.stderr.write(`${String(error)}\n`);
          process.exit(1);
        });
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    try {
      if (!(await refresh.refresh())) {
        await stop();
        process.exit(1);
      }
      process.stderr.write(
        `Previewing ${areas.map((area) => `${area.area} at http://localhost:${port}${area.mount}`).join(" and ")}\n`
      );
      await new Promise(() => undefined);
    } catch (error) {
      await stop();
      throw error;
    }
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
