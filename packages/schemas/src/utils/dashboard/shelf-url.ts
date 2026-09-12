import {
  GEO_SHELF_BLOCKED_HOSTNAME_SUFFIXES,
  GEO_SHELF_BLOCKED_HOSTNAMES,
  GEO_SHELF_HOSTNAME_ALIASES,
  GEO_SHELF_MIN_HOSTNAME_LABELS,
  GEO_SHELF_MIN_HOSTNAME_TLD_LENGTH,
  GEO_SHELF_TRACKING_PARAM_PREFIXES,
  GEO_SHELF_TRACKING_PARAMS,
  GEO_SHELF_URL_INVALID_MESSAGE,
} from "../../constants/dashboard/geo-shelf";

const ALLOWED_PROTOCOLS: readonly string[] = ["http:", "https:"];
const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const HOSTNAME_TLD = /^[a-z]+$/;
const TRAILING_DOT = /\.$/;
const LEADING_WWW = /^www\./;

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (GEO_SHELF_TRACKING_PARAMS.includes(lower)) {
    return true;
  }
  return GEO_SHELF_TRACKING_PARAM_PREFIXES.some((prefix) =>
    lower.startsWith(prefix)
  );
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname
    .toLowerCase()
    .replace(TRAILING_DOT, "")
    .replace(LEADING_WWW, "");
  return GEO_SHELF_HOSTNAME_ALIASES[normalized] ?? normalized;
}

function isBlockedHostname(hostname: string): boolean {
  if (GEO_SHELF_BLOCKED_HOSTNAMES.includes(hostname)) {
    return true;
  }
  return GEO_SHELF_BLOCKED_HOSTNAME_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
  );
}

/**
 * Accepts publicly routable hostnames only: no bare IPs, no single label hosts
 * such as `localhost`, and no internal/reserved suffixes such as `.local`.
 */
function isAllowedShelfHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (normalized.length === 0 || isBlockedHostname(normalized)) {
    return false;
  }
  const labels = normalized.split(".");
  if (labels.length < GEO_SHELF_MIN_HOSTNAME_LABELS) {
    return false;
  }
  if (!labels.every((label) => HOSTNAME_LABEL.test(label))) {
    return false;
  }
  const tld = labels.at(-1) ?? "";
  return (
    tld.length >= GEO_SHELF_MIN_HOSTNAME_TLD_LENGTH && HOSTNAME_TLD.test(tld)
  );
}

function parseShelfUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return null;
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return null;
  }
  if (!isAllowedShelfHostname(url.hostname)) {
    return null;
  }
  return url;
}

export function isAllowedShelfUrl(raw: string): boolean {
  return parseShelfUrl(raw) !== null;
}

export function tryCanonicalizeShelfUrl(raw: string): string | null {
  if (!isAllowedShelfUrl(raw)) {
    return null;
  }
  return canonicalizeShelfUrl(raw);
}

/**
 * Like the canonical URL but with the host untouched: some sites only serve
 * the `www.` variant, so the page is fetched exactly where the user found it.
 */
export function shelfFetchUrl(raw: string): string {
  const url = parseShelfUrl(raw);
  if (!url) {
    throw new Error(GEO_SHELF_URL_INVALID_MESSAGE);
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(TRAILING_DOT, "");
  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) {
      url.searchParams.delete(name);
    }
  }
  return url.toString();
}

export function canonicalizeShelfUrl(raw: string): string {
  const url = parseShelfUrl(raw);
  if (!url) {
    throw new Error(GEO_SHELF_URL_INVALID_MESSAGE);
  }
  url.hash = "";
  url.hostname = normalizeHostname(url.hostname);
  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) {
      url.searchParams.delete(name);
    }
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function shelfDomainFromUrl(url: string): string {
  const parsed = parseShelfUrl(url);
  if (!parsed) {
    throw new Error(GEO_SHELF_URL_INVALID_MESSAGE);
  }
  return normalizeHostname(parsed.hostname);
}
