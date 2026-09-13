"use client";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoActiveProject } from "@/types/geo";
import { getWebsiteDomain } from "@/utils/brand";

export function useGeoActiveProject(organizationId: string): GeoActiveProject {
  const { projectId } = useGeoProjectScope();
  const { projects, isLoading, isError, isReady } =
    useGeoProjectsDb(organizationId);
  const { data: brandData } = useBrandSettings(organizationId);
  const hasLoadedProjects = !isLoading && !isError && isReady;
  const project = hasLoadedProjects
    ? (projects.find((candidate) => candidate.id === projectId) ??
      projects.at(0) ??
      null)
    : null;
  const voice = project
    ? (brandData?.voices ?? []).find(
        (candidate) => candidate.id === project.brandSettingsId
      )
    : undefined;

  return {
    project,
    domain: getWebsiteDomain(voice?.websiteUrl ?? null),
  };
}
