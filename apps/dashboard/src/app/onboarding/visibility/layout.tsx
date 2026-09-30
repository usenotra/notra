import { OnboardingSplitLayout } from "@/components/onboarding/split-layout";
import { ONBOARDING_STEPS } from "@/constants/analytics-events";
import type { OnboardingSplitLayoutProps } from "@/types/onboarding";

export default function OnboardingVisibilityLayout({
  children,
}: OnboardingSplitLayoutProps) {
  return (
    <OnboardingSplitLayout step={ONBOARDING_STEPS.VISIBILITY}>
      {children}
    </OnboardingSplitLayout>
  );
}
