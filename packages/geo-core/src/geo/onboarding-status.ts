import { db } from "@notra/db/drizzle";
import { geoSettings, projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { GEO_PROJECTS_OLDEST_ORDER } from "../constants/geo-projects";
import type {
  GeoOnboardingLanguages,
  GeoOnboardingSnapshot,
  GeoOnboardingStage,
} from "../types/geo";
import { trackedGeoLanguages } from "../utils/geo-language-rows";

/** Settings of the project onboarding works on; the oldest one by default. */
async function findOnboardingSettings(
  organizationId: string,
  projectId?: string
) {
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
  if (!scoped) {
    return null;
  }
  const settings = await db.query.geoSettings.findFirst({
    columns: {
      scanStartedAt: true,
      lastScanAt: true,
      languages: true,
      promptLanguage: true,
    },
    where: eq(geoSettings.projectId, scoped.id),
  });
  return settings ?? null;
}

type OnboardingSettings = Awaited<ReturnType<typeof findOnboardingSettings>>;

function toStage(settings: OnboardingSettings): GeoOnboardingStage {
  if (!settings) {
    return "brand";
  }
  return settings.scanStartedAt || settings.lastScanAt
    ? "complete"
    : "competitors";
}

/** Saved languages, prompt language first; null before onboarding saved any. */
function toLanguages(
  settings: OnboardingSettings
): GeoOnboardingLanguages | null {
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

export async function getGeoOnboardingStage(
  organizationId: string,
  projectId?: string
): Promise<GeoOnboardingStage> {
  return toStage(await findOnboardingSettings(organizationId, projectId));
}

export async function getGeoOnboardingSnapshot(
  organizationId: string,
  projectId?: string
): Promise<GeoOnboardingSnapshot> {
  const settings = await findOnboardingSettings(organizationId, projectId);
  return { stage: toStage(settings), languages: toLanguages(settings) };
}
