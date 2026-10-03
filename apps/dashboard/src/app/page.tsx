import { isDemoMode } from "@notra/utils/demo-mode";
import { redirect } from "next/navigation";

import { DEMO_THEME_PARAM } from "@/constants/demo";
import { getLastActiveOrganization, getSession } from "@/lib/auth/actions";
import { demoThemeParser, serializeDemoTheme } from "@/lib/demo/theme-param";
import type { AppEntryPageProps } from "@/types/app-entry-page";
import { demoHomePath } from "@/utils/demo-return-to";
import { withGeoProject } from "@/utils/geo-paths";

// The app root used to be a config redirect to /login. That painted the login
// screen for signed-in users, then bounced them into the dashboard.
export const instant = false;

export default async function AppEntryPage({
  searchParams,
}: AppEntryPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const organization = await getLastActiveOrganization();

  if (organization) {
    if (!isDemoMode()) {
      redirect(withGeoProject(`/${organization.slug}`, organization.projectId));
    }
    // The public demo opens on GEO and keeps an embed's `?theme`.
    const { [DEMO_THEME_PARAM]: theme } = await searchParams;
    const home = withGeoProject(
      demoHomePath(organization.slug),
      organization.projectId
    );
    redirect(
      serializeDemoTheme(home, {
        [DEMO_THEME_PARAM]: demoThemeParser.parse(String(theme)),
      })
    );
  }

  redirect("/onboarding");
}
