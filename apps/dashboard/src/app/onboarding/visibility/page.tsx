import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { getGeoOnboardingStage } from "@notra/geo-core/geo/onboarding-status";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ONBOARDING_STEP_VISIBILITY } from "@/constants/onboarding";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { hasPaidSubscriptionHistory } from "@/lib/billing/subscription";
import type { OnboardingGeoPageProps } from "@/types/onboarding";
import {
  geoDashboardPath,
  geoOnboardingCompetitorsPath,
} from "@/utils/geo-paths";
import { onboardingProgressHrefs } from "@/utils/onboarding-progress";

import { VisibilityForm } from "./visibility-form";

export const metadata: Metadata = {
  title: "Track your AI visibility",
};

export default async function OnboardingVisibilityPage({
  searchParams,
}: OnboardingGeoPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();
  if (!organization) {
    redirect("/onboarding/workspace");
  }

  const brand = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, organization.id),
    columns: { websiteUrl: true, companyName: true },
  });
  if (!brand) {
    redirect("/onboarding/workspace");
  }

  const { project, replay } = await searchParams;
  const projectId =
    typeof project === "string" && project ? project : undefined;
  const isDevReplay = process.env.NODE_ENV === "development" && replay === "1";

  const [stage, hasPaidHistory] = await Promise.all([
    getGeoOnboardingStage(organization.id, projectId),
    hasPaidSubscriptionHistory(organization.id),
  ]);
  const inOnboardingFlow = isDevReplay || !hasPaidHistory;
  const dashboardHref = geoDashboardPath(organization.slug, projectId);
  const skipHref =
    inOnboardingFlow && !isDevReplay ? "/onboarding/pricing" : dashboardHref;

  return (
    <VisibilityForm
      companyName={brand.companyName}
      inOnboardingFlow={inOnboardingFlow}
      nextHref={geoOnboardingCompetitorsPath(projectId, isDevReplay)}
      organizationId={organization.id}
      progressHrefs={onboardingProgressHrefs({
        current: ONBOARDING_STEP_VISIBILITY,
        hasBrand: true,
        hasOrganization: true,
        projectId,
        replay: isDevReplay,
        stage,
      })}
      projectId={projectId}
      skipHref={skipHref}
      websiteUrl={brand.websiteUrl}
    />
  );
}
