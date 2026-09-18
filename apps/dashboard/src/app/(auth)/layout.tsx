import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthWordmark } from "@/components/auth/auth-wordmark";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { withGeoProject } from "@/utils/geo-paths";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session?.user) {
    const organization = await getLastActiveOrganization();

    if (organization) {
      redirect(withGeoProject(`/${organization.slug}`, organization.projectId));
    } else {
      redirect("/onboarding");
    }
  }
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <section className="flex h-full min-h-0 w-full flex-col items-center justify-between px-6 py-5 lg:px-10 lg:py-6">
        <AuthWordmark href="https://usenotra.com" />
        <div className="w-full max-w-md">{children}</div>
        <div>
          <p className="text-muted-foreground px-8 text-center text-xs">
            By continuing, you agree to our{" "}
            <Link
              className="hover:text-primary underline underline-offset-4"
              href="https://usenotra.com/terms"
              rel="noopener noreferrer"
              target="_blank"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="hover:text-primary underline underline-offset-4"
              href="https://usenotra.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
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
