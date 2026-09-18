import { getGeoOnboardingStage } from "@notra/geo-core/geo/onboarding-status";
import { redirect } from "next/navigation";

import { ONBOARDING_STEP_PRICING } from "@/constants/onboarding";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { redirectIfAnyOrganizationHasPaidHistory } from "@/lib/onboarding/billing-gate";
import { onboardingProgressHrefs } from "@/utils/onboarding-progress";

import { PricingClient } from "../pricing-client";

export default async function OnboardingPricingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();
  if (!organization) {
    await redirectIfAnyOrganizationHasPaidHistory();
    redirect("/onboarding/workspace");
  }

  const stage = await getGeoOnboardingStage(organization.id);

  return (
    <PricingClient
      progressHrefs={onboardingProgressHrefs({
        current: ONBOARDING_STEP_PRICING,
        hasBrand: true,
        hasOrganization: true,
        stage,
      })}
      slug={organization.slug}
    />
  );
}
