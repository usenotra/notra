import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IntegrationDetailView } from "@/components/integrations/integration-detail-view";
import { fetchIntegration } from "@/lib/integrations/fetch";
import type { IntegrationDetailPageProps } from "@/types/integrations";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export async function generateMetadata({
  params,
}: IntegrationDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const integration = await fetchIntegration(id);

  if (!integration) {
    return { title: "Integration not found" };
  }

  const title = `${integration.name} integration for Notra`;
  const description =
    integration.description ??
    `Connect ${integration.name} to your Notra workspace in one click.`;
  const url = `${SITE_URL}/integrations/${integration.slug ?? integration.id}`;

  return {
    title,
    description,
    alternates: pageAlternates(url),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Notra",
      images: [PAGE_SOCIAL_IMAGES.integrations],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [PAGE_SOCIAL_IMAGES.integrations.url],
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
    },
  };
}

export default async function IntegrationDetailPage({
  params,
}: IntegrationDetailPageProps) {
  const { id } = await params;
  const integration = await fetchIntegration(id);

  if (!integration) {
    notFound();
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Integrations", url: `${SITE_URL}/integrations` },
    {
      name: integration.name,
      url: `${SITE_URL}/integrations/${integration.slug ?? integration.id}`,
    },
  ]);

  return (
    <div className="flex w-full flex-col items-center antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <IntegrationDetailView integration={integration} />
    </div>
  );
}
