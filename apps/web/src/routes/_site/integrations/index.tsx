import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { ConsoleCallout } from "@/components/integrations/console-callout";
import { IntegrationModal } from "@/components/integrations/integration-modal";
import { IntegrationsMarketplace } from "@/components/integrations/integrations-marketplace";
import { IntegrationsMarketplaceFallback } from "@/components/integrations/integrations-marketplace-fallback";
import { DYNAMIC_PAGE_CACHE_CONTROL } from "@/constants/proxy";
import { getIntegration, getIntegrations } from "@/lib/integrations/functions";
import { buildCategoryFilters } from "@/lib/integrations/helpers";
import { integrationsSearchSchema } from "@/schemas/integrations";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Notra Integrations Marketplace";
const description =
  "Browse integrations built by the community and reviewed by us. Connect any of them to your Notra workspace in one click.";
const url = `${SITE_URL}/integrations`;

const metadata: Metadata = {
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

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Integrations", url },
]);

export const Route = createFileRoute("/_site/integrations/")({
  validateSearch: integrationsSearchSchema,
  loaderDeps: ({ search }) => ({ integration: search.integration }),
  loader: async ({ deps }) => {
    const [integrations, modalIntegration] = await Promise.all([
      getIntegrations(),
      deps.integration
        ? getIntegration({ data: { id: deps.integration } }).catch(() => null)
        : null,
    ]);
    return { integrations, modalIntegration };
  },
  head: () => buildHead(metadata),
  headers: () => ({ "Cache-Control": DYNAMIC_PAGE_CACHE_CONTROL }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { integrations, modalIntegration } = Route.useLoaderData();
  const categories = buildCategoryFilters(integrations);

  return (
    <>
      <div className="flex w-full flex-col items-center pb-8 antialiased [font-synthesis:none]">
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbJsonLd),
          }}
          type="application/ld+json"
        />
        <Suspense
          fallback={
            <IntegrationsMarketplaceFallback
              categories={categories}
              integrations={integrations}
            />
          }
        >
          <IntegrationsMarketplace
            categories={categories}
            integrations={integrations}
          />
        </Suspense>
        <ConsoleCallout />
      </div>
      {modalIntegration ? (
        <IntegrationModal integration={modalIntegration} />
      ) : null}
    </>
  );
}
