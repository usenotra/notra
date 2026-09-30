import { redirect } from "next/navigation";

import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { withGeoProject } from "@/utils/geo-paths";

// The app root used to be a config redirect to /login. That painted the login
// screen for signed-in users, then bounced them into the dashboard.
export const instant = false;

export default async function AppEntryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();

  if (organization) {
    redirect(withGeoProject(`/${organization.slug}`, organization.projectId));
  }

  redirect("/onboarding");
}
