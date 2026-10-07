import {
  DNS_LABEL_MAX_LENGTH,
  SITE_PREVIEW_HOST_SEPARATOR,
  SITE_PREVIEW_KEY_MAX_LENGTH,
  SITE_RESERVED_SLUGS,
  SITE_SLUG_MAX_LENGTH,
  SITE_SLUG_MIN_LENGTH,
} from "@notra/sites-core/constants/sites";
import type { ParsedSiteHost } from "@notra/sites-core/types/hosts";

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const PREVIEW_KEY = /^(?:pr|br)-[a-z0-9-]+$/;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-|-$/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;

function dashCase(value: string): string {
  return value
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS, "-")
    .replace(EDGE_DASHES, "");
}

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
    !SITE_RESERVED_SLUGS.has(slug)
  );
}

export function slugifySiteName(name: string): string {
  return dashCase(name.normalize("NFKD").replace(COMBINING_MARKS, ""))
    .slice(0, SITE_SLUG_MAX_LENGTH)
    .replace(/-$/, "");
}

export function siteAliasHost(slug: string, hostingDomain: string): string {
  return `${slug}.${hostingDomain}`;
}

export function pullRequestPreviewKey(prNumber: number): string {
  return `pr-${prNumber}`;
}

function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 6);
}

export function branchPreviewKey(branch: string, siteSlug: string): string {
  const maxLength = Math.min(
    SITE_PREVIEW_KEY_MAX_LENGTH,
    DNS_LABEL_MAX_LENGTH - SITE_PREVIEW_HOST_SEPARATOR.length - siteSlug.length
  );
  const full = `br-${dashCase(branch)}`;
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
  if (!(isValidSiteSlug(slug) && PREVIEW_KEY.test(previewKey))) {
    return null;
  }
  return { kind: "preview", slug, previewKey };
}
