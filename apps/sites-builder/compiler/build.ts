import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

import { hasErrors } from "@notra/sites-compiler/utils/diagnostics";
import { SITE_CSP_MAX_SCRIPT_HASHES } from "@notra/sites-core/constants/security";
import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";
import type {
  SiteBuildRequest,
  SiteBuildResult,
  SiteDiagnostic,
} from "@notra/sites-core/types/build";
import { buildSiteContentSecurityPolicy } from "@notra/sites-core/utils/content-security-policy";
import {
  joinMountPath,
  listMountedAreas,
  normalizeSiteMounts,
  pathCollidesWithOtherMount,
} from "@notra/sites-core/utils/mounts";

import type { BuildParams } from "../src/types/build-params";
import { normalizeAgentInstructions, writeAgentFiles } from "./agent-files";
import { AREA_PAGES_FILE, ASTRO_LOG_NOISE } from "./constants/build";
import { writeOgImages } from "./og-images";
import { prepareSite } from "./prepare";
import type { AreaPages } from "./types/agent-files";
import type { AstroPackageJson, BuildSiteOptions } from "./types/build";
import { listFiles } from "./utils/fs";
import { siteHeadScripts } from "./utils/head-scripts";
import { inlineScriptHashes } from "./utils/inline-scripts";
import { unnestLinks } from "./utils/nested-links";
import { rewritePublicAssetUrls } from "./utils/public-assets";
import { hasReactComponents } from "./utils/react";

function astroBin(toolchainRoot: string): string {
  const require = createRequire(join(toolchainRoot, "package.json"));
  const packageJsonPath = require.resolve("astro/package.json");
  const packageJson = require(packageJsonPath) as AstroPackageJson;
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
    const forward = (chunk: Buffer) => {
      const text = chunk
        .toString()
        .split("\n")
        .filter(
          (line) => !ASTRO_LOG_NOISE.some((pattern) => pattern.test(line))
        )
        .join("\n");
      if (text.trim()) {
        onOutput(text);
      }
    };
    child.stdout.on("data", forward);
    child.stderr.on("data", forward);
    child.on("error", reject);
    child.on("close", (code) => resolvePromise(code ?? 1));
  });
}

export async function writeBuildParams(
  path: string,
  params: BuildParams
): Promise<void> {
  await writeFile(path, JSON.stringify(params));
}

function failedBuild(
  diagnostics: SiteDiagnostic[],
  areas: SiteBuildResult["areas"] = []
): SiteBuildResult {
  return {
    ok: false,
    diagnostics,
    areas,
    fileCount: 0,
    totalBytes: 0,
    redirects: [],
    contentSecurityPolicy: null,
  };
}

export async function buildSite(
  options: BuildSiteOptions
): Promise<SiteBuildResult> {
  const workDir =
    options.workDir ?? join(options.toolchainRoot, ".notra", "work");
  const mounts = normalizeSiteMounts(options.target.mounts);
  const prepared = await prepareSite({
    siteRoot: options.siteRoot,
    workDir,
    defaultConfig: options.target.defaultConfig,
  });
  const diagnostics = [
    ...prepared.collectDiagnostics,
    ...prepared.validation.diagnostics,
  ];
  const config = prepared.validation.config;
  if (hasErrors(diagnostics) || !(prepared.validation.ok && config)) {
    return failedBuild(diagnostics);
  }

  const ogImages = await writeOgImages({
    workDir,
    config,
    entries: prepared.validation.entries,
    publicFiles: prepared.publicFiles,
    includeDrafts: options.target.includeDrafts,
  });
  diagnostics.push(...ogImages.diagnostics);
  const ogImagePaths = Object.values(ogImages.manifest);
  if (ogImagePaths.length > 0) {
    process.stderr.write(
      `Generated ${ogImagePaths.length} share images in ${ogImages.durationMs} ms\n`
    );
  }
  const publicFileList = [...prepared.publicFiles, ...ogImagePaths];

  await rm(join(workDir, "out"), { recursive: true, force: true });
  await rm(join(workDir, "cache"), { recursive: true, force: true });
  await rm(options.outDir, { recursive: true, force: true });
  await mkdir(options.outDir, { recursive: true });

  const publicOrigin = new URL(options.target.publicOrigin).origin;
  const publicFiles = new Set(publicFileList);
  const areas: SiteBuildResult["areas"] = [];
  const areaPages: AreaPages[] = [];
  const pageHtml = new Map<string, string>();
  for (const { area, mount } of listMountedAreas(mounts)) {
    const paramsPath = join(workDir, `params.${area}.json`);
    await writeBuildParams(paramsPath, {
      area,
      mount,
      publicOrigin,
      siteId: options.target.siteId,
      deploymentId: options.target.deploymentId,
      noindex: options.target.noindex,
      includeDrafts: options.target.includeDrafts,
      branding: options.target.branding,
      workDir,
      publicFiles: publicFileList,
      fontStylesheet: prepared.fontStylesheet,
      mounts,
      config,
      hasReactComponents: hasReactComponents(prepared.validation.outputs),
      headScripts: siteHeadScripts(
        config,
        mount,
        prepared.customScripts,
        options.target.analytics
      ),
    });
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
      return failedBuild(diagnostics, areas);
    }

    const areaOut = join(workDir, "out", area);
    for (const file of await listFiles(areaOut)) {
      const relativePath = relative(areaOut, file).split("\\").join("/");
      if (relativePath === AREA_PAGES_FILE) {
        areaPages.push(JSON.parse(await readFile(file, "utf8")) as AreaPages);
        continue;
      }
      const urlPath = joinMountPath(mount, relativePath);
      if (pathCollidesWithOtherMount(mounts, area, urlPath)) {
        diagnostics.push({
          severity: "error",
          file: null,
          code: "mount_collision",
          message: `The ${area} page ${urlPath} overlaps another section's path. Rename it.`,
        });
        continue;
      }
      const target = join(options.outDir, urlPath);
      await mkdir(dirname(target), { recursive: true });
      if (file.endsWith(".html")) {
        const html = rewritePublicAssetUrls(
          unnestLinks(await readFile(file, "utf8")),
          mount,
          publicFiles
        );
        pageHtml.set(urlPath, html);
        await writeFile(target, html);
      } else {
        await cp(file, target);
      }
    }
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
    origin: publicOrigin,
    siteName: config.name,
    siteDescription: config.description,
    areas: areaPages,
    pageHtml,
    instructions: normalizeAgentInstructions(config.markdown.instructions),
    notFound: config.errors[404],
  });

  const scriptHashes = new Set(
    [...pageHtml.values()].flatMap((html) => inlineScriptHashes(html))
  );
  let contentSecurityPolicy: string | null = null;
  if (
    config.security.contentSecurityPolicy &&
    scriptHashes.size > SITE_CSP_MAX_SCRIPT_HASHES
  ) {
    diagnostics.push({
      severity: "error",
      file: null,
      code: "csp_too_many_inline_scripts",
      message: `The pages contain ${scriptHashes.size} different inline scripts; the limit is ${SITE_CSP_MAX_SCRIPT_HASHES}. Move them into scripts/*.js, or set security.contentSecurityPolicy to false in blog.json.`,
    });
  } else {
    contentSecurityPolicy = buildSiteContentSecurityPolicy({
      integrations: options.target.analytics ? config.integrations : {},
      security: config.security,
      scriptHashes,
    });
  }

  const outputFiles = await listFiles(options.outDir);
  const sizes = await Promise.all(
    outputFiles.map(async (file) => (await stat(file)).size)
  );
  return {
    ok: !hasErrors(diagnostics),
    diagnostics,
    areas,
    fileCount: outputFiles.length,
    totalBytes: sizes.reduce((sum, size) => sum + size, 0),
    redirects: config.redirects,
    contentSecurityPolicy,
  };
}

export async function readBuildTarget(path: string): Promise<SiteBuildRequest> {
  return siteBuildRequestSchema.parse(JSON.parse(await readFile(path, "utf8")));
}
