import { createFileRoute } from "@tanstack/react-router";

import { IntegrationDetailView } from "@/components/integrations/integration-detail-view";
import { getIntegration } from "@/lib/integrations/functions";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

export const Route = createFileRoute("/_site/integrations/$id")({
  loader: ({ params }) => getIntegration({ data: { id: params.id } }),
  head: ({ loaderData: integration }) => {
    if (!integration) {
      return buildHead({ title: "Integration not found" });
    }

    const title = `${integration.name} integration for Notra`;
    const description =
      integration.description ??
      `Connect ${integration.name} to your Notra workspace in one click.`;
    const url = `${SITE_URL}/integrations/${integration.slug ?? integration.id}`;

    return buildHead({
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
    });
  },
  component: IntegrationDetailPage,
});

function IntegrationDetailPage() {
  const integration = Route.useLoaderData();

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
