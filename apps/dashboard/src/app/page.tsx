import { isDemoMode } from "@notra/utils/demo-mode";
import { redirect } from "next/navigation";

import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { demoHomePath } from "@/utils/demo-return-to";
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
    // The public demo opens on GEO; real workspaces on their home.
    const home = isDemoMode()
      ? demoHomePath(organization.slug)
      : `/${organization.slug}`;
    redirect(withGeoProject(home, organization.projectId));
  }

  redirect("/onboarding");
}
