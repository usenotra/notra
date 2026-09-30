import type { Metadata } from "next";

import { SlackCtaBanner } from "@/components/integrations/slack/slack-cta-banner";
import { SlackDemoSection } from "@/components/integrations/slack/slack-demo-section";
import { SlackFeatureList } from "@/components/integrations/slack/slack-feature-list";
import { SlackHero } from "@/components/integrations/slack/slack-hero";
import { SlackToolsSection } from "@/components/integrations/slack/slack-tools-section";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Slack integration for Notra";
const description =
  "Connect Slack and turn the threads you pick into announcements, changelog entries, and social posts, in your voice.";
const url = `${SITE_URL}/integrations/slack`;

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(url),
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.slack],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.slack.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Integrations", url: `${SITE_URL}/integrations` },
  { name: "Slack", url },
]);

export default function SlackIntegrationPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <SlackHero />
      <div className="flex w-[min(100%-3rem,62.5rem)] flex-col gap-16 pt-6 pb-10">
        <SlackDemoSection />
        <SlackFeatureList />
        <SlackToolsSection />
      </div>
      <section className="w-full px-6">
        <SlackCtaBanner />
      </section>
    </div>
  );
}
