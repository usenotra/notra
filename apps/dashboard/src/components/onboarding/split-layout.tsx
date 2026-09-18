import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthWordmark } from "@/components/auth/auth-wordmark";
import type { OnboardingSplitLayoutProps } from "@/types/onboarding";

export function OnboardingSplitLayout({
  children,
}: OnboardingSplitLayoutProps) {
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <section className="flex h-full min-h-0 w-full flex-col items-center justify-between overflow-y-auto px-6 py-5 lg:px-10 lg:py-6">
        <AuthWordmark />
        <div className="w-full max-w-md min-w-0 py-6">{children}</div>
        <div aria-hidden="true" className="h-7" />
      </section>

      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-xl supports-[corner-shape:squircle]:rounded-2xl">
            <AuthBrandPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
