import { readFileSync } from "node:fs";

import type { BuildParams } from "../types/build-params";
import { configuredAreaTitle, withSiteName } from "../utils/area-titles";
import { mountPath } from "../utils/paths";

const paramsPath = process.env.NOTRA_BUILD_PARAMS;
if (!paramsPath) {
  throw new Error("NOTRA_BUILD_PARAMS is not set");
}

export const params: BuildParams = JSON.parse(readFileSync(paramsPath, "utf8"));
export const config = params.config;
const publicFiles = new Set(params.publicFiles);

export function href(path = ""): string {
  return mountPath(params.mount, path);
}

export function absoluteUrl(path: string): string {
  return new URL(path, params.publicOrigin).toString();
}

export function assetUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return publicFiles.has(normalized) ? href(normalized) : normalized;
}

export function areaTitle(area: BuildParams["area"]): string {
  return configuredAreaTitle(config, area);
}

export function namedAreaTitle(area: BuildParams["area"]): string {
  return withSiteName(config.name, areaTitle(area));
}

export function areaDescription(area: BuildParams["area"]): string | undefined {
  return config[area]?.description ?? config.description;
}

export function areaHref(area: BuildParams["area"]): string | null {
  if (area === params.area) {
    return href();
  }
  return params.mounts[area] ?? null;
}

export function markdownHref(pagePath?: string): string {
  return pagePath ? `${pagePath}.md` : href("index.md");
}

export function llmsHref(): string {
  return href("llms.txt");
}
