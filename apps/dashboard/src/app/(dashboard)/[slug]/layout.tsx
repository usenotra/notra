import {
  getSidebarOpenFromCookie,
  SIDEBAR_COOKIE_NAME,
} from "@notra/ui/lib/sidebar-state";
import { cookies } from "next/headers";

import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";
import { SIDEBAR_WIDTH_COOKIE_NAME } from "@/constants/nav";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { toOrganizationSummary } from "@/utils/organization-summary";
import { getSidebarWidthFromCookie } from "@/utils/sidebar-width";

export const instant = false;

interface OrganizationLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrganizationLayout({
  children,
  modal,
  params,
}: OrganizationLayoutProps) {
  const [cookieStore, { slug, organization }] = await Promise.all([
    cookies(),
    params.then(async ({ slug }) => ({
      slug,
      ...(await validateOrganizationAccess(slug)),
    })),
  ]);
  const initialSidebarOpen = getSidebarOpenFromCookie(
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  );
  const initialSidebarWidth = getSidebarWidthFromCookie(
    cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value
  );
  const organizationSummary = toOrganizationSummary(organization);

  return (
    <DashboardClientWrapper
      initialActiveOrganization={organizationSummary}
      initialSidebarOpen={initialSidebarOpen}
      initialSidebarWidth={initialSidebarWidth}
      modal={modal}
    >
      {children}
    </DashboardClientWrapper>
  );
}
