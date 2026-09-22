import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import type { CollectionPageProps } from "@/types/content/collection";
import { dehydrateCollectionQueries } from "@/utils/content-prefetch.server";

import PageClient from "./page-client";
import { GroupDetailSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Collection",
  description: "View all posts in a content collection.",
};

export const instant = true;

async function PageContent({ params }: CollectionPageProps) {
  const { slug, id } = await params;
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);

  return (
    <HydrationBoundary
      state={await dehydrateCollectionQueries(
        organization.id,
        id,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient
        collectionId={id}
        organizationId={organization.id}
        organizationSlug={slug}
      />
    </HydrationBoundary>
  );
}

function Page({ params }: CollectionPageProps) {
  return (
    <Suspense fallback={<GroupDetailSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
