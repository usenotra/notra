import { createFileRoute } from "@tanstack/react-router";

import { GranolaDemoSection } from "@/components/integrations/granola/granola-demo-section";
import { GranolaFeatureList } from "@/components/integrations/granola/granola-feature-list";
import { GranolaHero } from "@/components/integrations/granola/granola-hero";
import { GranolaToolsSection } from "@/components/integrations/granola/granola-tools-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import {
  GRANOLA_CTA_HEADING,
  GRANOLA_CTA_SUBCOPY,
  GRANOLA_SIGNUP_SOURCE,
} from "@/constants/granola-integration";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Granola integration for Notra";
const description =
  "Connect Granola and turn notes from customer calls into customer stories, changelog entries and posts in your brand voice.";
const url = `${SITE_URL}/integrations/granola`;

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
    images: [PAGE_SOCIAL_IMAGES.granola],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.granola.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Integrations", url: `${SITE_URL}/integrations` },
  { name: "Granola", url },
]);

export const Route = createFileRoute("/_site/integrations/granola")({
  head: () => buildHead(metadata),
  component: GranolaIntegrationPage,
});

function GranolaIntegrationPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <GranolaHero />
      <div className="flex w-[min(100%-3rem,62.5rem)] flex-col gap-16 pt-6 pb-10">
        <GranolaDemoSection />
        <GranolaFeatureList />
        <GranolaToolsSection />
      </div>
      <section className="w-full px-6">
        <CtaBanner
          heading={GRANOLA_CTA_HEADING}
          signupSource={GRANOLA_SIGNUP_SOURCE}
          subcopy={GRANOLA_CTA_SUBCOPY}
        />
      </section>
    </div>
  );
}
