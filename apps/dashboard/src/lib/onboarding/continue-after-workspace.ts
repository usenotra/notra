import { ONBOARDING_STEPS } from "@/constants/analytics-events";
import { followServerRedirect } from "@/lib/framework/follow-server-redirect";
import { skipOnboarding } from "@/lib/onboarding/skip";
import type { OnboardingExistingOrg } from "@/types/onboarding";

/**
 * After the workspace step: on to the GEO steps, which start from the brand
 * the website analysis creates. Without a website or an existing brand they
 * would send the user straight back, so onboarding finishes here instead.
 */
export async function continueAfterWorkspace(
  organization: OnboardingExistingOrg | null | undefined,
  value: { slug: string; websiteUrl: string }
) {
  if (!(value.websiteUrl.trim() || organization?.hasBrand)) {
    await followServerRedirect(
      skipOnboarding(
        organization?.slug ?? value.slug,
        ONBOARDING_STEPS.WORKSPACE
      )
    );
    return;
  }
  window.location.assign("/onboarding/visibility");
}
