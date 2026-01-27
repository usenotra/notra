import type { Metadata } from "next";
import { Suspense } from "react";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "AI Debug",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function Page({ params }: PageProps) {
  const { slug } = await params;
  const { organization } = await validateOrganizationAccess(slug);

  return (
    <Suspense>
      <PageClient
        organizationSlug={slug}
        organizationId={organization.id}
      />
    </Suspense>
  );
}

export default Page;
