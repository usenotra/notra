import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { RepoInputForm } from "@/components/star-video/repo-input-form";
import { StarVideoPreview } from "@/components/star-video/star-video-preview";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "GitHub Star Video Generator";
const description =
  "Turn any GitHub repository into a celebratory star-count video, with real stargazer avatars and confetti. Free, no sign-up.";
const url = `${SITE_URL}/repo-star-video`;

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
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_SOCIAL_IMAGE.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "GitHub Star Video Generator", url },
]);

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GitHub Star Video Generator",
  url,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export const Route = createFileRoute("/_site/repo-star-video")({
  head: () => buildHead(metadata),
  component: RepoStarVideoPage,
});

function RepoStarVideoPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }}
        type="application/ld+json"
      />

      <section className="flex w-full flex-col items-center gap-10 pb-16 antialiased [font-synthesis:none] md:gap-12 md:pb-24">
        <MarketingHeroWash
          subtitle="Drop in any repo and get a share-ready video that counts up your GitHub stars, with the whole stargazer crowd in the room."
          title={
            <>
              GitHub <span className="text-primary">Star</span> Video Generator
            </>
          }
        >
          <Suspense fallback={null}>
            <RepoInputForm />
          </Suspense>
        </MarketingHeroWash>

        <Suspense fallback={null}>
          <StarVideoPreview />
        </Suspense>
      </section>
    </div>
  );
}
