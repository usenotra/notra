import { readFileSync } from "node:fs";

export interface SiteLink {
  label: string;
  href: string;
}

interface FontSpec {
  family?: string;
  weight?: number;
  source?: string;
  format?: "woff" | "woff2";
}

/** notra.json after validation (see @notra/sites-core site-config schema). */
export interface SiteThemeConfig {
  theme: "notra";
  name: string;
  description?: string;
  logo?: string | { light: string; dark: string; href?: string };
  favicon?: string | { light: string; dark: string };
  colors: { primary: string; light?: string; dark?: string };
  appearance: { default: "light" | "dark" | "system"; strict: boolean };
  fonts?: FontSpec & { heading?: FontSpec; body?: FontSpec };
  background: {
    decoration: "none" | "grid" | "dots" | "gradient";
    color?: { light?: string; dark?: string };
  };
  styling: {
    codeblocks: "system" | "dark" | string | { light: string; dark: string };
  };
  navbar: { links: SiteLink[]; cta?: SiteLink };
  footer: { links: SiteLink[]; socials: Record<string, string> };
  blog?: { title?: string; description?: string };
  changelog?: { title?: string; description?: string };
}

/** Written by the notra-sites CLI for each area build; already validated there. */
export interface BuildParams {
  area: "blog" | "changelog";
  mount: string;
  publicOrigin: string;
  siteId: string;
  deploymentId: string;
  noindex: boolean;
  includeDrafts: boolean;
  workDir: string;
  publicFiles: string[];
  /** Mounts of every area, for cross-links between blog and changelog. */
  mounts: { blog?: string; changelog?: string };
  config: SiteThemeConfig;
}

const paramsPath = process.env.NOTRA_BUILD_PARAMS;
if (!paramsPath) {
  throw new Error("NOTRA_BUILD_PARAMS is not set");
}

export const params: BuildParams = JSON.parse(readFileSync(paramsPath, "utf8"));
export const config = params.config;
const basePrefix = params.mount === "/" ? "" : params.mount;
const publicFiles = new Set(params.publicFiles);

/** Path inside the current area: `href("post")` → `/blog/post`. */
export function href(path = ""): string {
  const tail = path.replace(/^\/+/, "");
  return tail ? `${basePrefix}/${tail}` : params.mount;
}

/** Absolute URL on the customer's public origin. */
export function absoluteUrl(path: string): string {
  return new URL(path, params.publicOrigin).toString();
}

/** Files from `public/` are served below the mount. Unknown absolute paths and URLs pass through. */
export function assetUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return publicFiles.has(normalized)
    ? `${basePrefix}${normalized}`
    : normalized;
}

export function areaTitle(area: BuildParams["area"]): string {
  return config[area]?.title ?? (area === "blog" ? "Blog" : "Changelog");
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

/** The Markdown twin of a page: `/blog/post` → `/blog/post.md`, the area index → `/blog/index.md`. */
export function markdownHref(pagePath?: string): string {
  return pagePath ? `${pagePath}.md` : href("index.md");
}

/** llms.txt for this area; at the root mount it is the site-wide one. */
export function llmsHref(): string {
  return params.mount === "/" ? "/llms.txt" : href("llms.txt");
}
