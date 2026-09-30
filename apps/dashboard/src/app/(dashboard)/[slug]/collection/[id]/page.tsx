import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import type { CollectionPageProps } from "@/types/content/collection";

import PageClient from "./page-client";
import { GroupDetailSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("content.collections.detail");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

async function Page({ params }: CollectionPageProps) {
  const { slug, id } = await params;
  const { organization } = await validateOrganizationAccess(slug);

  return (
    <Suspense fallback={<GroupDetailSkeleton />}>
      <PageClient
        collectionId={id}
        organizationId={organization.id}
        organizationSlug={slug}
      />
    </Suspense>
  );
}
export default Page;
