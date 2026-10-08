import { MOUNT_SEGMENT } from "@notra/sites-core/constants/mounts";
import {
  SITE_AREAS,
  SITE_MOUNT_MAX_SEGMENTS,
} from "@notra/sites-core/constants/sites";
import type {
  SiteArea,
  SiteMountedArea,
  SiteMounts,
} from "@notra/sites-core/types/deployment";

class SiteMountError extends Error {
  readonly name = "SiteMountError";
}

export function normalizeMountPath(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }
  if (segments.length > SITE_MOUNT_MAX_SEGMENTS) {
    throw new SiteMountError(
      `Mount "${input}" is nested too deep (max ${SITE_MOUNT_MAX_SEGMENTS} segments)`
    );
  }
  for (const segment of segments) {
    if (!MOUNT_SEGMENT.test(segment) || segment === "_notra") {
      throw new SiteMountError(
        `Mount "${input}" may only contain lowercase letters, digits and dashes`
      );
    }
  }
  return `/${segments.join("/")}`;
}

function isWithin(path: string, mount: string): boolean {
  if (mount === "/") {
    return true;
  }
  return path === mount || path.startsWith(`${mount}/`);
}

export function normalizeSiteMounts(mounts: SiteMounts): SiteMounts {
  const normalized: SiteMounts = {};
  for (const area of SITE_AREAS) {
    const value = mounts[area];
    if (value !== undefined) {
      normalized[area] = normalizeMountPath(value);
    }
  }
  if (normalized.blog && normalized.changelog) {
    if (normalized.blog === normalized.changelog) {
      throw new SiteMountError("Blog and changelog need different paths");
    }
    const nestedNonRoot =
      (normalized.blog !== "/" &&
        isWithin(normalized.changelog, normalized.blog)) ||
      (normalized.changelog !== "/" &&
        isWithin(normalized.blog, normalized.changelog));
    if (nestedNonRoot) {
      throw new SiteMountError(
        "Blog and changelog paths may not be nested inside each other"
      );
    }
  }
  if (!(normalized.blog ?? normalized.changelog)) {
    throw new SiteMountError("At least one area needs a path");
  }
  return normalized;
}

export function listMountedAreas(mounts: SiteMounts): SiteMountedArea[] {
  const areas: SiteMountedArea[] = [];
  for (const area of SITE_AREAS) {
    const mount = mounts[area];
    if (mount) {
      areas.push({ area, mount });
    }
  }
  return areas;
}

export function resolveAreaForPath(
  mounts: SiteMounts,
  pathname: string
): SiteMountedArea | null {
  let best: SiteMountedArea | null = null;
  for (const entry of listMountedAreas(mounts)) {
    if (!isWithin(pathname, entry.mount)) {
      continue;
    }
    if (!best || entry.mount.length > best.mount.length) {
      best = entry;
    }
  }
  return best;
}

export function joinMountPath(mount: string, path: string): string {
  const tail = path.replace(/^\/+/, "");
  if (mount === "/") {
    return `/${tail}`;
  }
  return tail ? `${mount}/${tail}` : mount;
}

export function pathCollidesWithOtherMount(
  mounts: SiteMounts,
  area: SiteArea,
  urlPath: string
): boolean {
  const owner = resolveAreaForPath(mounts, urlPath);
  return owner !== null && owner.area !== area;
}
