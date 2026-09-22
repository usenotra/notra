import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { dehydrateSkillsQueries } from "@/utils/dashboard-list-prefetch.server";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Skills",
};

export const instant = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function PageContent({ params }: PageProps) {
  const { slug } = await params;
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);

  return (
    <HydrationBoundary
      state={await dehydrateSkillsQueries(
        organization.id,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient slug={slug} />
    </HydrationBoundary>
  );
}

function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent {...props} />
    </Suspense>
  );
}

export default Page;
