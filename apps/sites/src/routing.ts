import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/schemas/deployment";

/** `/a/../b`, encoded slashes and NUL bytes never reach the bucket. */
export function normalizeRequestPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) {
    return null;
  }
  const segments: string[] = [];
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      return null;
    }
    segments.push(segment);
  }
  const normalized = `/${segments.join("/")}`;
  return decoded.endsWith("/") && normalized !== "/"
    ? `${normalized}/`
    : normalized;
}

export function resolveFile(
  files: Map<string, SiteManifestFile>,
  path: string
): SiteManifestFile | null {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const candidates = path.endsWith("/")
    ? [`${trimmed}/index.html`]
    : [path, `${path}/index.html`, `${path}.html`];
  if (path === "/") {
    candidates.unshift("/index.html");
  }
  for (const candidate of candidates) {
    const file = files.get(candidate);
    if (file) {
      return file;
    }
  }
  return null;
}

export function matchRedirect(
  manifest: SiteManifest,
  path: string
): { location: string; status: number } | null {
  const bare = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  for (const rule of manifest.redirects) {
    if (rule.source.endsWith("/*")) {
      const prefix = rule.source.slice(0, -2);
      if (bare === prefix || bare.startsWith(`${prefix}/`)) {
        const rest = bare.slice(prefix.length);
        const destination = rule.destination.endsWith("/*")
          ? `${rule.destination.slice(0, -2)}${rest}`
          : rule.destination;
        return { location: destination, status: rule.status };
      }
    } else if (rule.source === bare) {
      return { location: rule.destination, status: rule.status };
    }
  }
  return null;
}

/**
 * `/blog/post.md` and `/blog/post/index.md` both name the Markdown twin the
 * builder writes next to `/blog/post/index.html`.
 */
export function resolveMarkdownFile(
  files: Map<string, SiteManifestFile>,
  path: string
): SiteManifestFile | null {
  if (!path.endsWith(".md")) {
    return null;
  }
  return files.get(path) ?? files.get(`${path.slice(0, -3)}/index.md`) ?? null;
}

export function markdownTwin(
  files: Map<string, SiteManifestFile>,
  file: SiteManifestFile
): SiteManifestFile | null {
  return file.path.endsWith("/index.html")
    ? (files.get(`${file.path.slice(0, -".html".length)}.md`) ?? null)
    : null;
}

const MARKDOWN_TYPES = new Set(["text/markdown", "text/x-markdown"]);
const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);

/** True when the client asks for Markdown at least as much as for HTML (agents do; browsers never). */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) {
    return false;
  }
  let markdown = 0;
  let html = 0;
  for (const part of accept.split(",")) {
    const [type = "", ...parameters] = part.trim().toLowerCase().split(";");
    const qParameter = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("q="));
    const quality = qParameter ? Number(qParameter.slice(2)) : 1;
    if (Number.isNaN(quality)) {
      continue;
    }
    if (MARKDOWN_TYPES.has(type.trim())) {
      markdown = Math.max(markdown, quality);
    } else if (HTML_TYPES.has(type.trim())) {
      html = Math.max(html, quality);
    }
  }
  return markdown > 0 && markdown >= html;
}
