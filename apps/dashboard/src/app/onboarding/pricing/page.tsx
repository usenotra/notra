import { getGeoOnboardingStage } from "@notra/geo-core/geo/onboarding-status";
import { redirect } from "next/navigation";

import { ONBOARDING_STEP_PRICING } from "@/constants/onboarding";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { redirectIfAnyOrganizationHasPaidHistory } from "@/lib/onboarding/billing-gate";
import type { OnboardingGeoPageProps } from "@/types/onboarding";
import { onboardingProgressHrefs } from "@/utils/onboarding-progress";

import { PricingClient } from "../pricing-client";

export default async function OnboardingPricingPage({
  searchParams,
}: OnboardingGeoPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();
  if (!organization) {
    await redirectIfAnyOrganizationHasPaidHistory();
    redirect("/onboarding/workspace");
  }

  const { project, replay } = await searchParams;
  const projectId =
    typeof project === "string" && project ? project : undefined;
  const isDevReplay = process.env.NODE_ENV === "development" && replay === "1";
  const stage = await getGeoOnboardingStage(organization.id, projectId);

  return (
    <PricingClient
      progressHrefs={onboardingProgressHrefs({
        current: ONBOARDING_STEP_PRICING,
        hasBrand: true,
        hasOrganization: true,
        projectId,
        replay: isDevReplay,
        stage,
      })}
      slug={organization.slug}
    />
  );
}
