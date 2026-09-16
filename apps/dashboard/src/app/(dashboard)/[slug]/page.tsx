import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveAiProductAccess } from "@/lib/billing/subscription";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { redirectOrgRootToStoredMode } from "@/lib/nav/org-root-redirect";
import { getGreeting } from "@/utils/dashboard-greeting";
import { dehydrateDashboardHomeQueries } from "@/utils/dashboard-home-prefetch.server";
import { geoRequestedProjectId } from "@/utils/geo-hydration";

import PageClient from "./page-client";
import { DashboardPageSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { organization, user, member } = await validateOrganizationAccess(slug);
  const { hasAccess } = await resolveAiProductAccess(organization.id);
  if (!hasAccess) {
    redirect(`/${slug}/feedback`);
  }
  await redirectOrgRootToStoredMode(slug, searchParams);
  const [requestHeaders, search] = await Promise.all([headers(), searchParams]);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    geoRequestedProjectId(search)
  );
  const greeting = getGreeting(new Date());
  const userName = user.name?.trim();
  const greetingText = userName ? `${greeting}, ${userName}!` : `${greeting}!`;

  return (
    <HydrationBoundary
      state={await dehydrateDashboardHomeQueries(
        organization.id,
        projectId,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <Suspense fallback={<DashboardPageSkeleton />}>
        <PageClient greetingText={greetingText} organizationSlug={slug} />
      </Suspense>
    </HydrationBoundary>
  );
}
export default Page;
