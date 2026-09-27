import { Effect } from "effect";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { resolveOrganizationIntegrationConnect } from "@/lib/integrations/deeplink-resolution";

import PageClient from "../page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return { title: tCommon("labels.integrations") };
}

async function Page({
  params,
}: {
  params: Promise<{
    slug: string;
    integrationSlug: string;
  }>;
}) {
  const { slug, integrationSlug } = await params;
  const resolution = await Effect.runPromise(
    resolveOrganizationIntegrationConnect({
      organizationSlug: slug,
      integrationSlugParam: integrationSlug,
    })
  );

  if (resolution.kind === "redirect") {
    redirect(resolution.path);
  }

  return (
    <Suspense>
      <PageClient
        connectSlug={resolution.connectSlug}
        organizationSlug={slug}
      />
    </Suspense>
  );
}

export default Page;
