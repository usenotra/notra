import { BRAND_NAME_MAX_LENGTH } from "@notra/ai/schemas/limits";
import { publicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import type { GeoProject } from "@notra/geo-core/types/geo";

import type { GeoProjectBrandIdentity } from "@/types/geo";

export function projectBrandIdentityName(
  projectName: string,
  identities: GeoProjectBrandIdentity[]
): string {
  const name = projectName.trim().slice(0, BRAND_NAME_MAX_LENGTH);
  const names = new Set(identities.map((identity) => identity.name));
  let candidate = name;
  let number = 2;
  while (names.has(candidate)) {
    const suffix = ` (${number++})`;
    candidate = `${name.slice(0, BRAND_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
  }
  return candidate;
}

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
  const parsed = publicWebsiteUrlSchema.safeParse(value);
  return parsed.success ? new URL(parsed.data).href : null;
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
