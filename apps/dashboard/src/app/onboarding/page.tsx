import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { getGeoOnboardingStage } from "@notra/geo-core/geo/onboarding-status";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { redirectIfAnyOrganizationHasPaidHistory } from "@/lib/onboarding/billing-gate";
import type { OnboardingGeoPageProps } from "@/types/onboarding";
import {
  geoOnboardingCompetitorsPath,
  geoOnboardingPath,
  geoOnboardingPricingPath,
  geoOnboardingWorkspacePath,
} from "@/utils/geo-paths";

export default async function OnboardingPage({
  searchParams,
}: OnboardingGeoPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  await redirectIfAnyOrganizationHasPaidHistory();

  const { project, replay } = await searchParams;
  const projectId =
    typeof project === "string" && project ? project : undefined;
  const isDevReplay = process.env.NODE_ENV === "development" && replay === "1";

  const organization = await getLastActiveOrganization();

  if (!organization) {
    redirect(geoOnboardingWorkspacePath(projectId, isDevReplay));
  }

  const brand = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, organization.id),
    columns: { id: true },
  });

  if (!brand) {
    redirect(geoOnboardingWorkspacePath(projectId, isDevReplay));
  }

  const stage = await getGeoOnboardingStage(organization.id, projectId);
  if (stage === "brand") {
    redirect(geoOnboardingPath(projectId, isDevReplay));
  }
  if (stage === "competitors") {
    redirect(geoOnboardingCompetitorsPath(projectId, isDevReplay));
  }

  redirect(geoOnboardingPricingPath(projectId, isDevReplay));
}
