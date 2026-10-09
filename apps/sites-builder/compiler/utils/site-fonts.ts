import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  SITE_ASSETS_DIR,
  SITE_CONFIG_FILENAME,
} from "@notra/sites-core/constants/sites";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

import { declaredFonts } from "../../src/utils/theme-fonts";
import {
  FONT_CSS_MAX_BYTES,
  FONT_DOWNLOAD_CONCURRENCY,
  FONT_FETCH_TIMEOUT_MS,
  FONT_FILE_MAX_BYTES,
  FONT_LICENSE_LOCATIONS,
  FONT_PATH_RE,
  FONT_URL_RE,
  FONT_USER_AGENT,
  GOOGLE_FONTS_CSS_URL,
  GOOGLE_FONTS_LICENSE_URL,
} from "../constants/fonts";
import type { SiteFontsResult } from "../types/fonts";
import { exists, writeFileEnsured } from "./fs";

async function fetchFontAsset(url: string, maxBytes: number): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS),
    headers: { "User-Agent": FONT_USER_AGENT },
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`Font download failed (${response.status})`);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > maxBytes) {
        throw new Error("Font download exceeded its size limit");
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

async function fetchFontLicense(family: string): Promise<Buffer> {
  const directory = family.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [category, name] of FONT_LICENSE_LOCATIONS) {
    try {
      return await fetchFontAsset(
        `${GOOGLE_FONTS_LICENSE_URL}/${category}/${directory}/${name}`,
        FONT_CSS_MAX_BYTES
      );
    } catch {
      // Older fonts use Apache or Ubuntu licenses instead of OFL.
    }
  }
  throw new Error(
    `Could not retrieve the redistribution license for ${family}`
  );
}

export async function prepareSiteFonts(
  config: SiteConfig,
  workDir: string
): Promise<SiteFontsResult> {
  const fonts = declaredFonts(config.fonts).filter((font) => !font.source);
  if (fonts.length === 0) {
    return { publicFiles: [], diagnostics: [] };
  }

  let stagingDir: string | undefined;
  let publicDir: string | undefined;
  try {
    const url = new URL(GOOGLE_FONTS_CSS_URL);
    const families = new Map<string, (number | undefined)[]>();
    for (const font of fonts) {
      const weights = families.get(font.family) ?? [];
      weights.push(font.weight);
      families.set(font.family, weights);
    }
    for (const [family, weights] of [...families].sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      const explicit = weights.filter((weight) => weight !== undefined);
      const requested = weights.includes(undefined)
        ? `${Math.min(300, ...explicit)}..${Math.max(800, ...explicit)}`
        : [...new Set(explicit)].sort((a, b) => a - b).join(";");
      url.searchParams.append("family", `${family}:wght@${requested}`);
    }
    url.searchParams.set("display", "swap");
    const key = createHash("sha256").update(url.toString()).digest("hex");
    // Preparation clears site/, but unchanged preview fonts can survive in this cache.
    const cacheRoot = join(workDir, "font-cache");
    const cacheDir = join(cacheRoot, key);
    const publicPath = `/${SITE_ASSETS_DIR}/fonts/${key}`;
    publicDir = join(workDir, "site", "public", publicPath);
    if (!(await exists(cacheDir))) {
      await mkdir(cacheRoot, { recursive: true });
      stagingDir = await mkdtemp(join(cacheRoot, "batch-"));
      await downloadSiteFonts(url, [...families.keys()], stagingDir);
      await rename(stagingDir, cacheDir);
      stagingDir = undefined;
    }
    const names = await readdir(cacheDir);
    const stylesheet = names.find((name) => name.endsWith(".css"));
    if (!stylesheet) {
      throw new Error("Cached font stylesheet is missing");
    }
    await cp(cacheDir, publicDir, { recursive: true });
    return {
      stylesheet: `${publicPath}/${stylesheet}`,
      publicFiles: names.map((name) => `${publicPath}/${name}`),
      diagnostics: [],
    };
  } catch (error) {
    // Downloads never touch public/. Remove a partial copy if publishing itself failed.
    await Promise.all(
      [stagingDir, publicDir]
        .filter((path) => path !== undefined)
        .map((path) => rm(path, { recursive: true, force: true }))
    );
    return {
      publicFiles: [],
      diagnostics: [
        {
          severity: "warning",
          file: SITE_CONFIG_FILENAME,
          code: "font_download",
          message: `Could not bundle site fonts; system fonts will be used. ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

async function downloadSiteFonts(
  url: URL,
  families: string[],
  stagingDir: string
): Promise<void> {
  const css = (
    await fetchFontAsset(url.toString(), FONT_CSS_MAX_BYTES)
  ).toString("utf8");
  const urls = [
    ...new Set(
      [...css.matchAll(FONT_URL_RE)].flatMap((match) =>
        match[1] ? [match[1]] : []
      )
    ),
  ];
  if (urls.length === 0) {
    throw new Error("Font stylesheet contains no font files");
  }
  // Validate the entire stylesheet before making any font requests.
  const sources = urls.map((source) => {
    const parsed = new URL(source);
    if (
      parsed.protocol !== "https:" ||
      parsed.host !== "fonts.gstatic.com" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !FONT_PATH_RE.test(parsed.pathname)
    ) {
      throw new Error("Unsupported font file URL");
    }
    return { source, extension: parsed.pathname.split(".").at(-1) };
  });
  const replacements = new Map<string, string>();
  const downloads = families.map((family) => async () => {
    const license = await fetchFontLicense(family);
    const hash = createHash("sha256")
      .update(license)
      .digest("hex")
      .slice(0, 16);
    await writeFileEnsured(
      join(stagingDir, `font-license-${hash}.txt`),
      license
    );
  });
  downloads.push(
    ...sources.map(({ source, extension }) => async () => {
      const bytes = await fetchFontAsset(source, FONT_FILE_MAX_BYTES);
      const hash = createHash("sha256")
        .update(bytes)
        .digest("hex")
        .slice(0, 16);
      const name = `font-${hash}.${extension}`;
      await writeFileEnsured(join(stagingDir, name), bytes);
      replacements.set(source, `./${name}`);
    })
  );
  // Bound in-flight buffers, and wait for every worker before cleaning a failed batch.
  const results = await Promise.allSettled(
    Array.from({ length: FONT_DOWNLOAD_CONCURRENCY }, async () => {
      let download = downloads.shift();
      while (download) {
        await download();
        download = downloads.shift();
      }
    })
  );
  for (const result of results) {
    if (result.status === "rejected") {
      throw result.reason;
    }
  }
  const localCss = css.replace(
    FONT_URL_RE,
    (_, source: string) => `url("${replacements.get(source)}")`
  );
  if (/https?:\/\//i.test(localCss) || /@import/i.test(localCss)) {
    throw new Error("Unsupported external font stylesheet reference");
  }
  const hash = createHash("sha256").update(localCss).digest("hex").slice(0, 16);
  const stylesheet = `fonts-${hash}.css`;
  await writeFileEnsured(join(stagingDir, stylesheet), localCss);
}
