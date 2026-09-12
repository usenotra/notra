import type { GeoProject } from "@notra/geo-core/types/geo";

const createdGeoProjectByTempId = new Map<string, GeoProject>();

export function rememberCreatedGeoProject(
  tempId: string,
  project: GeoProject
): void {
  createdGeoProjectByTempId.set(tempId, project);
}

export function takeCreatedGeoProject(tempId: string): GeoProject | undefined {
  const project = createdGeoProjectByTempId.get(tempId);
  if (project) {
    createdGeoProjectByTempId.delete(tempId);
  }
  return project;
}
