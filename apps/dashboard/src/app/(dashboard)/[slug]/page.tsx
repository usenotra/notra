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
  // Independent of each other, so both start before either is awaited. The
  // stored-mode redirect keeps precedence over the access check; the no-op
  // handler stops Node from flagging the loser of the race as unhandled.
  const redirected = redirectOrgRootToStoredMode(slug, searchParams);
  const access = validateOrganizationAccess(slug);
  void access.catch(() => undefined);
  await redirected;
  const { user } = await access;
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
