import type { Metadata } from "next";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";

import Loading from "../loading";
import PageClient from "./page-client";

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

async function Page({ params }: PageProps) {
  const { slug, id } = await params;
  const { organization } = await validateOrganizationAccess(slug);

  return (
    <Suspense fallback={<Loading />}>
      <PageClient
        contentId={id}
        key={`${organization.id}:${id}`}
        organizationId={organization.id}
        organizationSlug={slug}
      />
    </Suspense>
  );
}
export default Page;
