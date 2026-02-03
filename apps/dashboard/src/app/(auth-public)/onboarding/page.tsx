import { redirect } from "next/navigation";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { OnboardingClient } from "./page-client";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization(session.user.id);

  if (organization) {
    redirect(`/${organization.slug}`);
  }

  return <OnboardingClient />;
}
