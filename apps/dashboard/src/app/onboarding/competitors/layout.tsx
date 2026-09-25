import { OnboardingSplitLayout } from "@/components/onboarding/split-layout";
import { ONBOARDING_STEPS } from "@/constants/analytics-events";
import type { OnboardingSplitLayoutProps } from "@/types/onboarding";

export default function OnboardingCompetitorsLayout({
  children,
}: OnboardingSplitLayoutProps) {
  return (
    <OnboardingSplitLayout step={ONBOARDING_STEPS.COMPETITORS}>
      {children}
    </OnboardingSplitLayout>
  );
}
