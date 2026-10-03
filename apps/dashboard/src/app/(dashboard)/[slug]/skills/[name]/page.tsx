import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { dehydrateSkillDetailQuery } from "@/utils/dashboard-list-prefetch.server";

import { SkillDetailSkeleton } from "../skeleton";
import PageClient from "./page-client";

interface PageProps {
  params: Promise<{ slug: string; name: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("skills.detail");
  return {
    title: t("metaTitle"),
  };
}

export const instant = true;

async function PageContent({ params }: PageProps) {
  const { slug, name } = await params;
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);

  return (
    <HydrationBoundary
      state={await dehydrateSkillDetailQuery(
        organization.id,
        name,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient
        key={`${organization.id}:${name}`}
        name={name}
        organizationId={organization.id}
        slug={slug}
      />
    </HydrationBoundary>
  );
}

function Page(props: PageProps) {
  return (
    <Suspense fallback={<SkillDetailSkeleton />}>
      <PageContent {...props} />
    </Suspense>
  );
}

export default Page;
