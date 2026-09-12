import type { GeoProject } from "@notra/geo-core/types/geo";

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
