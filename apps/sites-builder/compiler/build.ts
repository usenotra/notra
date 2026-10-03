import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

import {
  type SiteBuildRequest,
  type SiteBuildResult,
  siteBuildRequestSchema,
} from "@notra/sites-core/schemas/build";
import {
  listMountedAreas,
  normalizeSiteMounts,
  pathCollidesWithOtherMount,
} from "@notra/sites-core/utils/mounts";

import { type AreaPages, writeAgentFiles } from "./agent-files";
import { prepareSite } from "./prepare";
import { rewritePublicAssetUrls } from "./utils/public-assets";

/** Page list the theme emits for {@link writeAgentFiles}; consumed here, never deployed. */
const AREA_PAGES_FILE = "notra-pages.json";

function astroBin(toolchainRoot: string): string {
  const require = createRequire(join(toolchainRoot, "package.json"));
  const packageJsonPath = require.resolve("astro/package.json");
  const packageJson = require(packageJsonPath) as {
    bin: string | Record<string, string>;
  };
  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin.astro;
  return resolve(dirname(packageJsonPath), bin ?? "astro.js");
}

export function runAstro(
  toolchainRoot: string,
  command: "build" | "dev" | "stop",
  paramsPath: string,
  extraArgs: string[] = [],
  onOutput: (chunk: string) => void = (chunk) => process.stderr.write(chunk)
): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const args = command === "stop" ? ["dev", "stop"] : [command];
    const child = spawn(
      process.execPath,
      [astroBin(toolchainRoot), ...args, "--root", toolchainRoot, ...extraArgs],
      {
        cwd: toolchainRoot,
        env: {
          ...process.env,
          NOTRA_BUILD_PARAMS: paramsPath,
          ASTRO_TELEMETRY_DISABLED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    child.stdout.on("data", (chunk: Buffer) => onOutput(chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => onOutput(chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolvePromise(code ?? 1));
  });
}

async function listFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        result.push(path);
      }
    }
  };
  await walk(root);
  return result;
}

/**
 * Builds every mounted area with its own `base`, then merges the outputs into
 * `outDir` at their mount paths (`out/blog/**`, `out/changelog/**`).
 */
export async function buildSite(options: {
  toolchainRoot: string;
  siteRoot: string;
  target: SiteBuildRequest;
  outDir: string;
  workDir?: string;
}): Promise<SiteBuildResult> {
  const workDir =
    options.workDir ?? join(options.toolchainRoot, ".notra", "work");
  const mounts = normalizeSiteMounts(options.target.mounts);
  const prepared = await prepareSite({ siteRoot: options.siteRoot, workDir });
  const diagnostics = [
    ...prepared.collectDiagnostics,
    ...prepared.validation.diagnostics,
  ];
  const config = prepared.validation.config;
  if (!(prepared.validation.ok && config)) {
    return {
      ok: false,
      diagnostics,
      areas: [],
      fileCount: 0,
      totalBytes: 0,
      redirects: [],
    };
  }

  await rm(join(workDir, "out"), { recursive: true, force: true });
  // Astro's content layer caches rendered entries by content, not by config (theme, code
  // block styling), so a stale cache would render with old settings.
  await rm(join(workDir, "cache"), { recursive: true, force: true });
  await rm(options.outDir, { recursive: true, force: true });
  await mkdir(options.outDir, { recursive: true });

  const publicFiles = new Set(prepared.publicFiles);
  const areas: SiteBuildResult["areas"] = [];
  const areaPages: AreaPages[] = [];
  /** Built HTML by URL path, the source for each page's Markdown twin. */
  const pageHtml = new Map<string, string>();
  for (const { area, mount } of listMountedAreas(mounts)) {
    const paramsPath = join(workDir, `params.${area}.json`);
    await writeFile(
      paramsPath,
      JSON.stringify({
        area,
        mount,
        publicOrigin: new URL(options.target.publicOrigin).origin,
        siteId: options.target.siteId,
        deploymentId: options.target.deploymentId,
        noindex: options.target.noindex,
        includeDrafts: options.target.includeDrafts,
        workDir,
        publicFiles: prepared.publicFiles,
        mounts,
        config,
      })
    );
    const started = Date.now();
    let log = "";
    const exitCode = await runAstro(
      options.toolchainRoot,
      "build",
      paramsPath,
      [],
      (chunk) => {
        log += chunk;
        process.stderr.write(chunk);
      }
    );
    if (exitCode !== 0) {
      diagnostics.push({
        severity: "error",
        file: null,
        code: "build_failed",
        message: `Building the ${area} failed:\n${log.trim().split("\n").slice(-25).join("\n")}`,
      });
      return {
        ok: false,
        diagnostics,
        areas,
        fileCount: 0,
        totalBytes: 0,
        redirects: [],
      };
    }

    const areaOut = join(workDir, "out", area);
    for (const file of await listFiles(areaOut)) {
      const relativePath = relative(areaOut, file).split("\\").join("/");
      if (relativePath === AREA_PAGES_FILE) {
        areaPages.push(JSON.parse(await readFile(file, "utf8")) as AreaPages);
        continue;
      }
      const urlPath =
        mount === "/" ? `/${relativePath}` : `${mount}/${relativePath}`;
      if (pathCollidesWithOtherMount(mounts, area, urlPath)) {
        diagnostics.push({
          severity: "error",
          file: null,
          code: "mount_collision",
          message: `The ${area} page ${urlPath} would sit inside another section's path. Rename it.`,
        });
        continue;
      }
      const target = join(options.outDir, urlPath);
      await mkdir(dirname(target), { recursive: true });
      if (file.endsWith(".html")) {
        const html = rewritePublicAssetUrls(
          await readFile(file, "utf8"),
          mount,
          publicFiles
        );
        pageHtml.set(urlPath, html);
        await writeFile(target, html);
      } else {
        await cp(file, target);
      }
    }
    // Lets the dashboard verify a customer proxy: {origin}{mount}/_notra/probe.txt must name this site.
    const probePath = join(options.outDir, mount, "_notra", "probe.txt");
    await mkdir(dirname(probePath), { recursive: true });
    await writeFile(
      probePath,
      `notra-site=${options.target.siteId}\narea=${area}\n`
    );
    areas.push({ area, mount, durationMs: Date.now() - started });
  }

  await writeAgentFiles({
    outDir: options.outDir,
    origin: new URL(options.target.publicOrigin).origin,
    siteName: config.name,
    siteDescription: config.description,
    areas: areaPages,
    pageHtml,
  });

  let fileCount = 0;
  let totalBytes = 0;
  for (const file of await listFiles(options.outDir)) {
    fileCount += 1;
    totalBytes += (await stat(file)).size;
  }
  const ok = !diagnostics.some((diagnostic) => diagnostic.severity === "error");
  return {
    ok,
    diagnostics,
    areas,
    fileCount,
    totalBytes,
    redirects: config.redirects,
  };
}

export async function readBuildTarget(path: string): Promise<SiteBuildRequest> {
  return siteBuildRequestSchema.parse(JSON.parse(await readFile(path, "utf8")));
}
