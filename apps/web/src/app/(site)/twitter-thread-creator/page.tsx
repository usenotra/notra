import type { Metadata } from "next";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import ThreadBuilder from "@/components/threads/thread-builder";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "X Thread Builder";
const description =
  "Draft, reorder, and ship X (Twitter) threads in a clean, distraction-free workspace. Free, no sign-up.";
const url = `${SITE_URL}/twitter-thread-creator`;

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
  { name: "X Thread Builder", url },
]);

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "X Thread Builder",
  url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function ThreadsPage() {
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
          subtitle="Write, reorder, and preview your thread in one place. Free, no sign-up."
          title={
            <>
              X (Twitter) <span className="text-primary">Threads</span> Creator
            </>
          }
        />

        <div className="w-full max-w-3xl px-4 sm:px-6">
          <div className="rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-2 sm:p-4 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
            <div className="bg-background rounded-2xl border border-[#1E1E1E0D] p-1 sm:p-2 dark:border-white/5">
              <ThreadBuilder />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
