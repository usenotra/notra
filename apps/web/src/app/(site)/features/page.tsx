import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { ActivityFeed } from "@/components/activity-feed";
import BrandVoicePreview from "@/components/brand-voice-preview";
import { AnswerExampleSection } from "@/components/landing/answer-example-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FeaturesSection } from "@/components/landing/features-section";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import ReferencesPreview from "@/components/references-preview";
import {
  FEATURES_PAGE_DESCRIPTION,
  FEATURES_PAGE_DEVELOPER_CARDS,
  FEATURES_PAGE_DEVELOPERS,
  FEATURES_PAGE_HERO_SUBTITLE,
  FEATURES_PAGE_HERO_TITLE_HIGHLIGHT,
  FEATURES_PAGE_HERO_TITLE_PREFIX,
  FEATURES_PAGE_IMPROVE,
  FEATURES_PAGE_IMPROVE_CARDS,
  FEATURES_PAGE_STUDIO,
  FEATURES_PAGE_STUDIO_CARDS,
  FEATURES_PAGE_TITLE,
  FEATURES_PAGE_TRACKING,
  FEATURES_PAGE_TRACKING_CARDS,
} from "@/constants/features-page";
import type {
  FeaturesPageCard,
  FeaturesPageSectionCopy,
  FeaturesPageStudioVisual,
} from "@/types/features-page";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const IntegrationOrbit = dynamic(
  () => import("@/components/integration-orbit")
);

const CARD_SHELL_CLASS =
  "flex flex-col gap-2 rounded-[1.5rem] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-8 [box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#ECECEC_0rem_0rem_0rem_0.0625rem] dark:bg-white/[0.02] dark:bg-none dark:[box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#FFFFFF14_0rem_0rem_0rem_0.0625rem]";

const VISUAL_CARD_SHELL_CLASS =
  "flex flex-col gap-6 overflow-clip rounded-[1.5rem] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-6 [box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#ECECEC_0rem_0rem_0rem_0.0625rem] sm:p-8 dark:bg-none dark:bg-white/[0.02] dark:[box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#FFFFFF14_0rem_0rem_0rem_0.0625rem]";

const SECTION_CLASS =
  "mx-auto flex w-full max-w-360 flex-col items-center px-6 lg:px-20";

const CARD_TITLE_CLASS =
  "font-sans text-[1.375rem]/7 font-medium tracking-[-0.015em] text-[#0A0D14] dark:text-white";

const CARD_DESCRIPTION_CLASS =
  "font-sans text-base/6 font-medium text-[#6A6B70] dark:text-white/60";

const url = `${SITE_URL}/features`;

export const metadata: Metadata = {
  title: FEATURES_PAGE_TITLE,
  description: FEATURES_PAGE_DESCRIPTION,
  alternates: pageAlternates(url),
  openGraph: {
    title: FEATURES_PAGE_TITLE,
    description: FEATURES_PAGE_DESCRIPTION,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.features],
  },
  twitter: {
    card: "summary_large_image",
    title: FEATURES_PAGE_TITLE,
    description: FEATURES_PAGE_DESCRIPTION,
    images: [PAGE_SOCIAL_IMAGES.features.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    ...FEATURES_PAGE_TRACKING_CARDS,
    ...FEATURES_PAGE_IMPROVE_CARDS,
  ].map((feature, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: feature.title,
    description: feature.description,
  })),
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: FEATURES_PAGE_TITLE, url },
]);

function SectionHeader({ heading, subcopy }: FeaturesPageSectionCopy) {
  return (
    <header className="flex flex-col items-center gap-4 pb-12 text-center md:pb-16">
      <h2 className="font-display text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-black md:text-[2.75rem]/13 dark:text-white">
        {heading}
      </h2>
      <p className="font-display max-w-206.25 text-xl/7.5 font-medium tracking-[-0.01em] text-balance text-[#1E1E1EBF] dark:text-white/70">
        {subcopy}
      </p>
    </header>
  );
}

function TextCard({ title, description }: FeaturesPageCard) {
  return (
    <div className={CARD_SHELL_CLASS}>
      <h3 className={CARD_TITLE_CLASS}>{title}</h3>
      <p className={CARD_DESCRIPTION_CLASS}>{description}</p>
    </div>
  );
}

function StudioVisual({ kind }: { kind: FeaturesPageStudioVisual }) {
  if (kind === "activity") {
    return (
      <div className="bg-background relative flex w-full items-end justify-center overflow-hidden rounded-[1rem] border border-[#1E1E1E14] p-4 dark:border-white/10">
        <ActivityFeed />
        <div className="from-background pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-linear-to-t to-transparent" />
      </div>
    );
  }

  if (kind === "brandVoice") {
    return (
      <div className="bg-background w-full overflow-hidden rounded-[1rem] border border-[#1E1E1E14] px-4 dark:border-white/10">
        <BrandVoicePreview />
      </div>
    );
  }

  if (kind === "integrations") {
    return (
      <div className="bg-background relative flex h-50 w-full items-center justify-center overflow-hidden rounded-[1rem] border border-[#1E1E1E14] sm:h-62.5 md:h-75 dark:border-white/10">
        <IntegrationOrbit className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="bg-background w-full overflow-hidden rounded-[1rem] border border-[#1E1E1E14] px-4 dark:border-white/10">
      <ReferencesPreview />
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="flex w-full flex-col items-center gap-20 pb-20 antialiased [font-synthesis:none] lg:gap-28 lg:pb-28">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(featuresJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <MarketingHeroWash
        subtitle={FEATURES_PAGE_HERO_SUBTITLE}
        title={
          <>
            {FEATURES_PAGE_HERO_TITLE_PREFIX}{" "}
            <span className="text-primary">
              {FEATURES_PAGE_HERO_TITLE_HIGHLIGHT}
            </span>
          </>
        }
      />

      <section className="-mt-20 w-full lg:-mt-28" id="dashboard">
        <FeaturesSection />
      </section>

      <section className={SECTION_CLASS} id="tracking">
        <SectionHeader {...FEATURES_PAGE_TRACKING} />
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES_PAGE_TRACKING_CARDS.map((card) => (
            <TextCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="w-full" id="answers">
        <AnswerExampleSection />
      </section>

      <section className={SECTION_CLASS} id="improve">
        <SectionHeader {...FEATURES_PAGE_IMPROVE} />
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          {FEATURES_PAGE_IMPROVE_CARDS.map((card) => (
            <TextCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className={SECTION_CLASS} id="developers">
        <SectionHeader {...FEATURES_PAGE_DEVELOPERS} />
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          {FEATURES_PAGE_DEVELOPER_CARDS.map((card) => (
            <TextCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className={SECTION_CLASS} id="studio">
        <SectionHeader {...FEATURES_PAGE_STUDIO} />
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          {FEATURES_PAGE_STUDIO_CARDS.map((card) => (
            <div className={VISUAL_CARD_SHELL_CLASS} key={card.title}>
              <div className="flex flex-col gap-1.5">
                <h3 className={CARD_TITLE_CLASS}>{card.title}</h3>
                <p className={CARD_DESCRIPTION_CLASS}>{card.description}</p>
              </div>
              <StudioVisual kind={card.visual} />
            </div>
          ))}
        </div>
      </section>

      <section className="w-full px-6 lg:px-20">
        <CtaBanner />
      </section>
    </div>
  );
}
