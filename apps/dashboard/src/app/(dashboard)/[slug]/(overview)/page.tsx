import type { Metadata } from "next";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { redirectOrgRootToStoredMode } from "@/lib/nav/org-root-redirect";
import { getGreeting } from "@/utils/dashboard-greeting";

import PageClient from "./page-client";
import { HomePageSkeleton } from "./skeleton";

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
  await redirectOrgRootToStoredMode(slug, searchParams);
  const { user } = await validateOrganizationAccess(slug);
  const greeting = getGreeting(new Date());
  const userName = user.name?.trim();
  const greetingText = userName ? `${greeting}, ${userName}!` : `${greeting}!`;

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <PageClient greetingText={greetingText} organizationSlug={slug} />
    </Suspense>
  );
}
export default Page;
