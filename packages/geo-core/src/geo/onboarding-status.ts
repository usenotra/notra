import { db } from "@notra/db/drizzle";
import { geoSettings, projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { GEO_PROJECTS_OLDEST_ORDER } from "../constants/geo-projects";
import type { GeoOnboardingLanguages, GeoOnboardingStage } from "../types/geo";
import { trackedGeoLanguages } from "../utils/geo-language-rows";

async function findOnboardingProjectId(
  organizationId: string,
  projectId?: string
): Promise<string | null> {
  const scoped = projectId
    ? await db.query.projects.findFirst({
        columns: { id: true },
        where: and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        ),
      })
    : await db.query.projects.findFirst({
        columns: { id: true },
        where: eq(projects.organizationId, organizationId),
        orderBy: GEO_PROJECTS_OLDEST_ORDER,
      });
  return scoped?.id ?? null;
}

export async function getGeoOnboardingStage(
  organizationId: string,
  projectId?: string
): Promise<GeoOnboardingStage> {
  const scopedId = await findOnboardingProjectId(organizationId, projectId);
  if (!scopedId) {
    return "brand";
  }

  const settings = await db.query.geoSettings.findFirst({
    columns: { scanStartedAt: true, lastScanAt: true },
    where: eq(geoSettings.projectId, scopedId),
  });
  if (!settings) {
    return "brand";
  }

  if (settings.scanStartedAt || settings.lastScanAt) {
    return "complete";
  }

  return "competitors";
}

/**
 * Languages of a project that already has GEO settings, prompt language first.
 * Null for a project onboarding has not configured yet.
 */
export async function getGeoOnboardingLanguages(
  organizationId: string,
  projectId?: string
): Promise<GeoOnboardingLanguages | null> {
  const scopedId = await findOnboardingProjectId(organizationId, projectId);
  if (!scopedId) {
    return null;
  }
  const settings = await db.query.geoSettings.findFirst({
    columns: { languages: true, promptLanguage: true },
    where: eq(geoSettings.projectId, scopedId),
  });
  if (!settings) {
    return null;
  }
  const { promptLanguage } = settings;
  return {
    promptLanguage,
    languages: trackedGeoLanguages(
      promptLanguage
        ? [promptLanguage, ...(settings.languages ?? [])]
        : (settings.languages ?? [])
    ),
  };
}
