"use client";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { ActiveProjectState } from "@/types/hooks/projects";
import { getLastVisitedProjectFromClient } from "@/utils/cookies";

/**
 * Resolves the project the sidebar switcher shows, using the same order the
 * switcher does: the `project` URL param, then the last-visited cookie, then
 * the organization's oldest project. Studio routes drop the URL param, so the
 * cookie keeps the scope stable across navigation without a wrong-project flash.
 */
export function useActiveProject(): ActiveProjectState {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const slug = activeOrganization?.slug ?? "";
  const [projectParam] = useGeoProjectQueryState();
  const { projects, isLoading } = useGeoProjectsDb(organizationId);

  if (!organizationId) {
    return { projectId: null, isResolved: false };
  }
  if (isLoading) {
    return { projectId: null, isResolved: false };
  }

  const fromParam = projects.find((project) => project.id === projectParam);
  if (fromParam) {
    return { projectId: fromParam.id, isResolved: true };
  }

  const lastVisitedProjectId = getLastVisitedProjectFromClient(slug);
  const restored =
    projects.find((project) => project.id === lastVisitedProjectId) ??
    projects.at(0);
  return { projectId: restored?.id ?? null, isResolved: true };
}
