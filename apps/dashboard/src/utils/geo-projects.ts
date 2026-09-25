import type { GeoProject } from "@notra/geo-core/types/geo";

import type { GeoProjectBrandIdentity } from "@/types/geo";

export function resolveProjectBrandSelection(
  website: string,
  identities: GeoProjectBrandIdentity[],
  selectedId: string | null,
  createdIdentity?: GeoProjectBrandIdentity
) {
  const host = projectWebsiteHost(website);
  const candidates = [...identities];
  if (
    createdIdentity &&
    !candidates.some((identity) => identity.id === createdIdentity.id)
  ) {
    candidates.push(createdIdentity);
  }
  const matches = candidates.filter(
    (identity) => host && projectWebsiteHost(identity.websiteUrl ?? "") === host
  );
  const selectedIdentity =
    matches.find((identity) => identity.id === selectedId) ??
    (matches.length === 1 ? matches[0] : undefined);
  return { matches, selectedIdentity };
}

export function projectWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".")
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function projectWebsiteHost(value: string): string | null {
  const url = projectWebsiteUrl(value);
  return url ? new URL(url).hostname.replace(/^www\./, "") : null;
}

/** Matches server `GEO_PROJECTS_OLDEST_ORDER` (createdAt ASC, id ASC). */
export function sortGeoProjectsOldestFirst(
  projects: GeoProject[]
): GeoProject[] {
  return projects.toSorted((left, right) => {
    const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }
    return left.id.localeCompare(right.id);
  });
}
