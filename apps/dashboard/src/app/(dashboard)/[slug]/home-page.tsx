import { HydrationBoundary } from "@tanstack/react-query";
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

interface DashboardHomePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function DashboardHomePage({
  params,
  searchParams,
}: DashboardHomePageProps) {
  const { slug } = await params;
  const accessPromise = validateOrganizationAccess(slug).then(
    async (access) => {
      const billing = await resolveAiProductAccess(access.organization.id);
      return { ...access, billing };
    }
  );
  const requestHeadersPromise = headers();
  await redirectOrgRootToStoredMode(slug, searchParams);
  const [{ organization, user, member, billing }, requestHeaders, search] =
    await Promise.all([accessPromise, requestHeadersPromise, searchParams]);
  if (!billing.hasAccess) {
    redirect(`/${slug}/feedback`);
  }
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
      <PageClient greetingText={greetingText} organizationSlug={slug} />
    </HydrationBoundary>
  );
}

export function DashboardHomePageShell(props: DashboardHomePageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardHomePage {...props} />
    </Suspense>
  );
}
