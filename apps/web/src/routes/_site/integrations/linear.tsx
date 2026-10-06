import { createFileRoute } from "@tanstack/react-router";

import { LinearDemoSection } from "@/components/integrations/linear/linear-demo-section";
import { LinearFeatureList } from "@/components/integrations/linear/linear-feature-list";
import { LinearHero } from "@/components/integrations/linear/linear-hero";
import { LinearToolsSection } from "@/components/integrations/linear/linear-tools-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import {
  LINEAR_CTA_HEADING,
  LINEAR_CTA_SUBCOPY,
  LINEAR_SIGNUP_SOURCE,
} from "@/constants/linear-integration";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Linear integration for Notra";
const description =
  "Connect Linear and turn finished issues, projects and cycles into release notes and changelog entries in your brand voice.";
const url = `${SITE_URL}/integrations/linear`;

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
    images: [PAGE_SOCIAL_IMAGES.linear],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.linear.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Integrations", url: `${SITE_URL}/integrations` },
  { name: "Linear", url },
]);

export const Route = createFileRoute("/_site/integrations/linear")({
  head: () => buildHead(metadata),
  component: LinearIntegrationPage,
});

function LinearIntegrationPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <LinearHero />
      <div className="flex w-[min(100%-3rem,62.5rem)] flex-col gap-16 pt-6 pb-10">
        <LinearDemoSection />
        <LinearFeatureList />
        <LinearToolsSection />
      </div>
      <section className="w-full px-6">
        <CtaBanner
          heading={LINEAR_CTA_HEADING}
          signupSource={LINEAR_SIGNUP_SOURCE}
          subcopy={LINEAR_CTA_SUBCOPY}
        />
      </section>
    </div>
  );
}
