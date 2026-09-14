import { OnboardingAccountMenu } from "@/components/onboarding/account-menu";
import { OnboardingRuntimeProviders } from "@/components/providers/onboarding-runtime-providers";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingRuntimeProviders>
      <div className="relative min-h-screen w-full">
        <div className="fixed bottom-4 left-4 z-10">
          <OnboardingAccountMenu />
        </div>
        {children}
      </div>
    </OnboardingRuntimeProviders>
  );
}
