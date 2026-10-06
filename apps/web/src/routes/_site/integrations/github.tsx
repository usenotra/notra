import { createFileRoute } from "@tanstack/react-router";

import { GithubDemoSection } from "@/components/integrations/github/github-demo-section";
import { GithubFeatureList } from "@/components/integrations/github/github-feature-list";
import { GithubHero } from "@/components/integrations/github/github-hero";
import { GithubToolsSection } from "@/components/integrations/github/github-tools-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import {
  GITHUB_CTA_HEADING,
  GITHUB_CTA_SUBCOPY,
  GITHUB_SIGNUP_SOURCE,
} from "@/constants/github-integration";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "GitHub integration for Notra";
const description =
  "Connect GitHub and turn merged pull requests, releases and commits into changelog entries and launch posts in your brand voice.";
const url = `${SITE_URL}/integrations/github`;

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
    images: [PAGE_SOCIAL_IMAGES.github],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.github.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Integrations", url: `${SITE_URL}/integrations` },
  { name: "GitHub", url },
]);

export const Route = createFileRoute("/_site/integrations/github")({
  head: () => buildHead(metadata),
  component: GithubIntegrationPage,
});

function GithubIntegrationPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <GithubHero />
      <div className="flex w-[min(100%-3rem,62.5rem)] flex-col gap-16 pt-6 pb-10">
        <GithubDemoSection />
        <GithubFeatureList />
        <GithubToolsSection />
      </div>
      <section className="w-full px-6">
        <CtaBanner
          heading={GITHUB_CTA_HEADING}
          signupSource={GITHUB_SIGNUP_SOURCE}
          subcopy={GITHUB_CTA_SUBCOPY}
        />
      </section>
    </div>
  );
}
