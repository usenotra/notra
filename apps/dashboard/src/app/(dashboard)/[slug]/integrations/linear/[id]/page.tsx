import { getLinearIntegrationById } from "@notra/ai/integrations/linear";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";

import Loading from "../../loading";
import PageClient from "./page-client";

interface PageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const t = await getTranslations("integrations.detailPage");
  const tCommon = await getTranslations("common");
  const { organization } = await validateOrganizationAccess(slug);
  const integration = await getLinearIntegrationById(id);

  if (!integration || integration.organizationId !== organization.id) {
    return { title: tCommon("labels.integration") };
  }

  return {
    title: t("metaTitle", { name: integration.displayName }),
  };
}

async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <PageClient integrationId={id} />
    </Suspense>
  );
}
export default Page;
