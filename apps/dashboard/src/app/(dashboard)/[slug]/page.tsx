import type { Metadata } from "next";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { redirectOrgRootToStoredMode } from "@/lib/nav/org-root-redirect";
import { getGreeting } from "@/utils/dashboard-greeting";

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
  // Start both operations together, but observe access failures even when the
  // stored-mode lookup throws a redirect.
  const [redirected, access] = await Promise.allSettled([
    redirectOrgRootToStoredMode(slug, searchParams),
    validateOrganizationAccess(slug),
  ]);
  if (access.status === "rejected") {
    throw access.reason;
  }
  if (redirected.status === "rejected") {
    throw redirected.reason;
  }
  const { user } = access.value;
  const greeting = getGreeting(new Date());
  const userName = user.name?.trim();
  const greetingText = userName ? `${greeting}, ${userName}!` : `${greeting}!`;

  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <PageClient greetingText={greetingText} organizationSlug={slug} />
    </Suspense>
  );
}
export default Page;
