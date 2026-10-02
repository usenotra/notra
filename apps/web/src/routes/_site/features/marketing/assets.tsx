import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Figma } from "@notra/ui/components/ui/svgs/figma";
import { Paper } from "@notra/ui/components/ui/svgs/paper";
import { createFileRoute } from "@tanstack/react-router";

import { CtaBanner } from "@/components/landing/cta-banner";
import { HeroVideoCarousel } from "@/components/marketing-assets/hero-video-carousel";
import { LoopVideo } from "@/components/marketing-assets/loop-video";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import { ASSET_HERO } from "@/lib/marketing-assets/constants/hero";
import { ASSET_SHOWCASE_SECTIONS } from "@/lib/marketing-assets/constants/showcase";
import {
  getAssetShowcaseDescription,
  getAssetShowcaseTitle,
} from "@/lib/marketing-assets/utils/showcase";
import type { Metadata } from "@/types/metadata";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Marketing Assets";
const description =
  "Notra turns merged PRs into marketing visuals in your brand. Real layers, real text, ready to paste into Paper or Figma.";
const url = `${SITE_URL}/features/marketing/assets`;

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

const assetsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: ASSET_SHOWCASE_SECTIONS.map((section, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: getAssetShowcaseTitle(section),
    description: getAssetShowcaseDescription(section),
  })),
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Features", url: `${SITE_URL}/features` },
  { name: "Marketing Assets", url },
]);

function PasteReadyLogos() {
  return (
    <div className="flex flex-wrap items-center gap-2 font-sans text-sm text-[#1E1E1E99] dark:text-white/60">
      <span>Paste-ready for</span>
      <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#1E1E1E1A] bg-[#C8B2EE40] px-3 text-[#1E1E1E] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
        <Paper aria-hidden="true" className="size-4" />
        Paper
      </span>
      <span>or</span>
      <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#1E1E1E1A] bg-[#C8B2EE40] px-3 text-[#1E1E1E] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
        <Figma aria-hidden="true" className="h-4 w-3" />
        Figma
      </span>
    </div>
  );
}

export const Route = createFileRoute("/_site/features/marketing/assets")({
  head: () => buildHead(metadata),
  component: MarketingAssetsPage,
});

function MarketingAssetsPage() {
  return (
    <div className="flex w-full flex-col items-center justify-start antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(assetsJsonLd) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <MarketingHeroWash
        subtitle={ASSET_HERO.description}
        title={
          <>
            {ASSET_HERO.title}
            <span className="text-primary"> {ASSET_HERO.accent}</span>
          </>
        }
      >
        <CtaButton
          nativeButton={false}
          render={<TrackedSignupLink source="marketing_assets_hero_cta" />}
          size="lg"
          variant="primary"
        >
          {ASSET_HERO.primaryCta}
        </CtaButton>
        <CtaButton
          nativeButton={false}
          render={<a href="#generate">{ASSET_HERO.secondaryCta}</a>}
          size="lg"
          variant="light"
        />
      </MarketingHeroWash>

      <div className="flex w-full flex-col items-center overflow-hidden">
        <section className="w-full px-6 pt-12 pb-8 md:px-12 md:pt-16 md:pb-10 lg:px-16">
          <div className="mx-auto w-full max-w-4xl">
            <HeroVideoCarousel videos={ASSET_HERO.videos} />
          </div>
        </section>

        {ASSET_SHOWCASE_SECTIONS.map((section) => {
          const Heading = "h2";
          return (
            <section
              className="w-full scroll-mt-24 border-t border-[#1E1E1E14] dark:border-white/10"
              id={section.id}
              key={section.id}
            >
              <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 md:px-12 md:py-20 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-16">
                <div
                  className={`flex flex-col gap-6 ${section.mediaSide === "left" ? "lg:order-2" : ""}`}
                >
                  <Heading className="font-display text-[2rem] leading-[1.12] font-medium tracking-[-0.02em] text-balance text-black md:text-[2.75rem] dark:text-white">
                    {section.headingPre}
                    <span className="text-primary">
                      {section.headingAccent}
                    </span>
                    {section.headingPost}
                  </Heading>
                  <div className="flex flex-col gap-4">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        className="font-sans text-base leading-7 font-medium text-[#1E1E1EBF] dark:text-white/70"
                        key={paragraph}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {section.id === "generate" ? <PasteReadyLogos /> : null}
                </div>
                <div
                  className={section.mediaSide === "left" ? "lg:order-1" : ""}
                >
                  <LoopVideo
                    label={section.videoLabel}
                    poster={section.posterSrc}
                    src={section.videoSrc}
                  />
                </div>
              </div>
            </section>
          );
        })}

        <section className="w-full px-6 pt-16 pb-20 lg:px-20 lg:pt-24 lg:pb-28">
          <CtaBanner />
        </section>
      </div>
    </div>
  );
}
