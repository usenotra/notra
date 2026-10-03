import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { dehydrateSkillsQueries } from "@/utils/dashboard-list-prefetch.server";

import Loading from "./loading";
import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return {
    title: tCommon("labels.skills"),
  };
}

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
      <PageClient organizationId={organization.id} slug={slug} />
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
