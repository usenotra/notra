import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { dehydrateContentDetailQueries } from "@/utils/content-prefetch.server";

import PageClient from "./page-client";
import { ContentDetailSkeleton } from "./skeleton";

interface PageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Content Detail",
  description: "View the details of a specific content item.",
};

export const instant = true;

async function PageContent({ params }: PageProps) {
  const { slug, id } = await params;
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);

  return (
    <HydrationBoundary
      state={await dehydrateContentDetailQueries(
        organization.id,
        id,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient
        contentId={id}
        key={`${organization.id}:${id}`}
        organizationId={organization.id}
        organizationSlug={slug}
      />
    </HydrationBoundary>
  );
}

function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<ContentDetailSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
