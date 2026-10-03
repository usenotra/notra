import {
  SITE_PREVIEW_HOST_SEPARATOR,
  SITE_PREVIEW_KEY_MAX_LENGTH,
  SITE_SLUG_MAX_LENGTH,
  SITE_SLUG_MIN_LENGTH,
} from "@notra/sites-core/constants/sites";

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "assets",
  "cdn",
  "docs",
  "mail",
  "notra",
  "preview",
  "previews",
  "static",
  "status",
]);

/** Lowercases, drops a trailing dot and a port. Returns null for anything that is not a plain DNS name. */
export function normalizeHostname(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  if (host.length === 0 || host.length > 253) {
    return null;
  }
  const labels = host.split(".");
  if (labels.length < 2) {
    return null;
  }
  return labels.every((label) => HOST_LABEL.test(label)) ? host : null;
}

export function isValidSiteSlug(slug: string): boolean {
  return (
    slug.length >= SITE_SLUG_MIN_LENGTH &&
    slug.length <= SITE_SLUG_MAX_LENGTH &&
    SLUG.test(slug) &&
    !slug.includes(SITE_PREVIEW_HOST_SEPARATOR) &&
    !RESERVED_SLUGS.has(slug)
  );
}

export function slugifySiteName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SITE_SLUG_MAX_LENGTH)
    .replace(/-$/, "");
}

export function siteAliasHost(slug: string, hostingDomain: string): string {
  return `${slug}.${hostingDomain}`;
}

/** `pr-12`, `br-feature-x`. Keys become a DNS label prefix, so they stay short and dash-safe. */
export function pullRequestPreviewKey(prNumber: number): string {
  return `pr-${prNumber}`;
}

const DNS_LABEL_MAX_LENGTH = 63;

function shortHash(value: string): string {
  // FNV-1a, enough to keep two long branches with the same prefix apart.
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 6);
}

/**
 * `br-feature-x`. The preview host is one DNS label (`{key}--{slug}`, max 63
 * chars), so long branch names are cut to fit the site's slug and get a short
 * hash of the full branch name to stay unique.
 */
export function branchPreviewKey(branch: string, siteSlug: string): string {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  const maxLength = Math.min(
    SITE_PREVIEW_KEY_MAX_LENGTH,
    DNS_LABEL_MAX_LENGTH - SITE_PREVIEW_HOST_SEPARATOR.length - siteSlug.length
  );
  const full = `br-${slug}`;
  if (full.length <= maxLength) {
    return full;
  }
  const suffix = `-${shortHash(branch)}`;
  return `${full.slice(0, maxLength - suffix.length).replace(/-+$/, "")}${suffix}`;
}

export function sitePreviewHost(
  previewKey: string,
  slug: string,
  hostingDomain: string
): string {
  return `${previewKey}${SITE_PREVIEW_HOST_SEPARATOR}${slug}.${hostingDomain}`;
}

export type ParsedSiteHost =
  | { kind: "alias"; slug: string }
  | { kind: "preview"; slug: string; previewKey: string }
  | { kind: "custom"; hostname: string };

/**
 * Classifies a request host. Only hosts directly below the hosting domain are
 * aliases or previews; everything else must be a registered custom domain.
 */
export function parseSiteHost(
  host: string,
  hostingDomain: string
): ParsedSiteHost | null {
  const hostname = normalizeHostname(host);
  if (!hostname) {
    return null;
  }
  const suffix = `.${hostingDomain}`;
  if (!hostname.endsWith(suffix)) {
    return { kind: "custom", hostname };
  }
  const label = hostname.slice(0, -suffix.length);
  if (label.includes(".")) {
    return null;
  }
  const separator = label.lastIndexOf(SITE_PREVIEW_HOST_SEPARATOR);
  if (separator === -1) {
    return isValidSiteSlug(label) ? { kind: "alias", slug: label } : null;
  }
  const previewKey = label.slice(0, separator);
  const slug = label.slice(separator + SITE_PREVIEW_HOST_SEPARATOR.length);
  if (!(isValidSiteSlug(slug) && /^(?:pr|br)-[a-z0-9-]+$/.test(previewKey))) {
    return null;
  }
  return { kind: "preview", slug, previewKey };
}
