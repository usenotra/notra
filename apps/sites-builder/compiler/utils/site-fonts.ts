import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  SITE_ASSETS_DIR,
  SITE_CONFIG_FILENAME,
} from "@notra/sites-core/constants/sites";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

import { declaredFonts } from "../../src/utils/theme-fonts";
import {
  FONT_CSS_MAX_BYTES,
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
import { writeFileEnsured } from "./fs";

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

  try {
    const url = new URL(GOOGLE_FONTS_CSS_URL);
    for (const font of fonts) {
      url.searchParams.append(
        "family",
        `${font.family}:wght@${font.weight ?? "300..800"}`
      );
    }
    url.searchParams.set("display", "swap");
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
    const publicFiles: string[] = [];
    for (const font of fonts) {
      const license = await fetchFontLicense(font.family);
      const hash = createHash("sha256")
        .update(license)
        .digest("hex")
        .slice(0, 16);
      const path = `/${SITE_ASSETS_DIR}/font-license-${hash}.txt`;
      await writeFileEnsured(join(workDir, "site", "public", path), license);
      publicFiles.push(path);
    }
    // Sequential downloads keep large, multi-subset families memory-bounded.
    for (const { source, extension } of sources) {
      const bytes = await fetchFontAsset(source, FONT_FILE_MAX_BYTES);
      const hash = createHash("sha256")
        .update(bytes)
        .digest("hex")
        .slice(0, 16);
      const name = `font-${hash}.${extension}`;
      const path = `/${SITE_ASSETS_DIR}/${name}`;
      await writeFileEnsured(join(workDir, "site", "public", path), bytes);
      replacements.set(source, `./${name}`);
      publicFiles.push(path);
    }
    const localCss = css.replace(
      FONT_URL_RE,
      (_, source: string) => `url("${replacements.get(source)}")`
    );
    if (/https?:\/\//i.test(localCss) || /@import/i.test(localCss)) {
      throw new Error("Unsupported external font stylesheet reference");
    }
    const hash = createHash("sha256")
      .update(localCss)
      .digest("hex")
      .slice(0, 16);
    const stylesheet = `/${SITE_ASSETS_DIR}/fonts-${hash}.css`;
    await writeFileEnsured(
      join(workDir, "site", "public", stylesheet),
      localCss
    );
    return {
      stylesheet,
      publicFiles: [...new Set([...publicFiles, stylesheet])],
      diagnostics: [],
    };
  } catch (error) {
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
