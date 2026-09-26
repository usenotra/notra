import type { Metadata } from "next";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { OfferingCheckForm } from "@/components/offering-check/offering-check-form";
import {
  OFFERING_CHECK_DESCRIPTION,
  OFFERING_CHECK_HERO_SUBTITLE,
  OFFERING_CHECK_SAMPLES,
  OFFERING_CHECK_TITLE,
  OFFERING_CHECK_URL,
} from "@/constants/offering-check";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { DEFAULT_SOCIAL_IMAGE, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = OFFERING_CHECK_TITLE;
const description = OFFERING_CHECK_DESCRIPTION;
const url = OFFERING_CHECK_URL;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
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
  { name: title, url },
]);

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: title,
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

const sectionTitleClass =
  "font-display text-[1.625rem]/8 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white";
const bodyClass =
  "font-sans text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] dark:text-white/70";

export default function OfferingCheckPage() {
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
          subtitle={OFFERING_CHECK_HERO_SUBTITLE}
          title={
            <>
              Does AI know your <span className="text-primary">features</span>?
            </>
          }
        />

        <div className="flex w-full max-w-[64rem] flex-col gap-10 px-4 sm:px-6 md:gap-12">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-2 sm:rounded-[2rem] sm:p-4 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
            <div className="bg-background rounded-2xl border border-[#1E1E1E0D] p-4 sm:p-6 dark:border-white/5">
              <OfferingCheckForm samples={OFFERING_CHECK_SAMPLES} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>Why we ask twice</h2>
            <p className={bodyClass}>
              Assistants answer from two places. What the model learned in
              training is always there, but it is months old and thin on
              anything you shipped recently. Web search is fresh, but it only
              runs for some questions and only finds what ranks. A feature the
              model knows from memory shows up in every answer. A feature it
              only finds by searching shows up when your page wins the search.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>What to do when it does not</h2>
            <p className={bodyClass}>
              Give the feature its own page with its name in the title, and say
              what it does in the first paragraph. Mention it in your changelog
              and docs, and link those pages from your homepage so crawlers
              reach them. Look at which sites the model read instead of yours.
              Those are the places where a mention moves the answer.
            </p>
            <p className={bodyClass}>
              One check is one sample. Models answer differently from run to run
              and from one assistant to the next, so a single miss is a hint and
              a pattern across many prompts is a finding. Notra runs those
              prompts daily across ChatGPT, Claude, Gemini and Perplexity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
