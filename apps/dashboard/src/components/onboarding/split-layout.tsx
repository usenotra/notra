import { useContext } from "react";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthWordmark } from "@/components/auth/auth-wordmark";
import { SkipOnboardingForm } from "@/components/onboarding/skip-onboarding-form";
import { OnboardingSplitLayoutContext } from "@/components/onboarding/split-layout-context";
import type { OnboardingStepLayoutProps } from "@/types/onboarding";

export function OnboardingSplitLayout({
  children,
  step,
}: OnboardingStepLayoutProps) {
  const context = useContext(OnboardingSplitLayoutContext);
  if (!context) {
    throw new Error("Onboarding layout requires its server-loaded context");
  }
  const { organizationSlug, canSkip } = context;

  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <section className="flex h-full min-h-0 w-full flex-col items-center justify-between overflow-y-auto px-6 py-5 lg:px-10 lg:py-6">
        <AuthWordmark />
        <div className="w-full max-w-md min-w-0 py-6">{children}</div>
        {organizationSlug && canSkip ? (
          <SkipOnboardingForm slug={organizationSlug} step={step} />
        ) : (
          <div aria-hidden="true" className="h-12" />
        )}
      </section>

      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-md supports-[corner-shape:squircle]:rounded-2xl">
            <AuthBrandPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
