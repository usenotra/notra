import { createFileRoute } from "@tanstack/react-router";
import type { OfferLike } from "~types/jsonld";

import { CtaBanner } from "@/components/landing/cta-banner";
import { LandingPricingSection } from "@/components/landing/pricing-section";
import { PromptCalculatorSection } from "@/components/landing/prompt-calculator";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import PricingComparisonTable from "@/components/pricing-comparison-table";
import { PRICING_SUBHEADING } from "@/constants/landing/pricing";
import type { Metadata } from "@/types/metadata";
import { PRICING_PLANS } from "@/utils/constants";
import { buildHead } from "@/utils/head";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  serializeJsonLd,
} from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Pricing";
const description =
  "Choose the right Notra plan for your team. Compare features across Starter, Growth, Scale and Enterprise tiers.";
const url = `${SITE_URL}/pricing`;

const offers: OfferLike[] = Object.values(PRICING_PLANS).flatMap((plan) => {
  if (plan.pricing.monthly === null) {
    return [];
  }

  return [
    {
      "@type": "Offer",
      name: `${plan.name} monthly plan`,
      description: plan.description,
      price: plan.pricing.monthly,
      priceCurrency: "USD",
      url,
      availability: "https://schema.org/OnlineOnly",
      itemCondition: "https://schema.org/NewCondition",
      category: plan.name,
    },
    {
      "@type": "Offer",
      name: `${plan.name} annual plan`,
      description: plan.description,
      price: plan.pricing.annually,
      priceCurrency: "USD",
      url,
      availability: "https://schema.org/OnlineOnly",
      itemCondition: "https://schema.org/NewCondition",
      category: plan.name,
    },
  ];
});

const productJsonLd = buildProductJsonLd({
  name: "Notra",
  description,
  image: `${SITE_URL}${DEFAULT_SOCIAL_IMAGE.url}`,
  url,
  offers,
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Pricing", url },
]);

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
    images: [PAGE_SOCIAL_IMAGES.pricing],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.pricing.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export const Route = createFileRoute("/_site/pricing")({
  head: () => buildHead(metadata),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <MarketingHeroWash
        subtitle={PRICING_SUBHEADING}
        title={
          <>
            Simple pricing that scales with what you{" "}
            <span className="text-primary">ship</span>
          </>
        }
      />

      <div className="flex w-full flex-col items-stretch justify-start overflow-x-clip">
        <LandingPricingSection showHeader={false} />

        <PromptCalculatorSection />

        <PricingComparisonTable />

        <div className="px-6 pt-8 pb-24 lg:px-20">
          <CtaBanner />
        </div>
      </div>
    </>
  );
}
