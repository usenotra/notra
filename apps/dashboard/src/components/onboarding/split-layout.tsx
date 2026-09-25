import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthWordmark } from "@/components/auth/auth-wordmark";
import { getLastActiveOrganization } from "@/lib/auth/actions";
import { skipOnboarding } from "@/lib/onboarding/skip";
import type { OnboardingSplitLayoutProps } from "@/types/onboarding";

export async function OnboardingSplitLayout({
  children,
}: OnboardingSplitLayoutProps) {
  const organization = await getLastActiveOrganization();

  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <section className="flex h-full min-h-0 w-full flex-col items-center justify-between overflow-y-auto px-6 py-5 lg:px-10 lg:py-6">
        <AuthWordmark />
        <div className="w-full max-w-md min-w-0 py-6">{children}</div>
        {organization ? (
          <form action={skipOnboarding} className="flex justify-center py-2">
            <button
              className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-sm hover:underline"
              type="submit"
            >
              Skip onboarding
            </button>
          </form>
        ) : (
          <div aria-hidden="true" className="h-7" />
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
