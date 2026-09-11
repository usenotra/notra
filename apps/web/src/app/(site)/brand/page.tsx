import { CtaButton } from "@notra/ui/components/shared/cta-button";
import type { Metadata } from "next";
import Link from "next/link";

import { BrandAssetCard } from "@/components/brand-asset-card";
import { BrandColorSwatch } from "@/components/brand-color-swatch";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { NotraMark } from "@/components/notra-mark";
import {
  BRAND_ASSETS,
  BRAND_COLORS,
  BRAND_FONTS,
  FONT_SAMPLE,
} from "@/lib/brand/constants";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { PAGE_SOCIAL_IMAGES, TWITTER_HANDLE } from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Brand Guidelines";
const description =
  "Official assets and guidelines to help you reference the Notra brand, including our logo, colors and typography.";
const url = `${SITE_URL}/brand`;

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Brand", url },
]);

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.brand],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.brand.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export default function BrandPage() {
  return (
    <div className="border-border/70 flex w-full flex-col items-center justify-start overflow-hidden border-b">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <MarketingHeroWash
        className="mb-12 md:mb-16"
        subtitle="Official assets and guidelines to help you reference the Notra brand, including our logo, colors and typography."
        title={
          <>
            Brand <span className="text-primary">Guidelines</span>
          </>
        }
      >
        <CtaButton
          nativeButton={false}
          render={<Link download href={BRAND_ASSETS.zip} />}
          variant="primary"
        >
          Download brand assets
        </CtaButton>
      </MarketingHeroWash>

      <div className="flex w-full max-w-5xl flex-col gap-16 px-6 pb-20 md:pb-24">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em]">
              Logo
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              The Notra mark. Keep it on a light surface and give it room to
              breathe. Hover a card to download the logo as SVG or PNG.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BrandAssetCard
              asset={BRAND_ASSETS.mark}
              copyLabel="Copy logo as SVG"
              downloadName="notra-mark"
              variant="light"
            >
              <NotraMark className="size-20 shrink-0" />
            </BrandAssetCard>
            <BrandAssetCard
              asset={BRAND_ASSETS.mark}
              copyLabel="Copy logo as SVG"
              downloadName="notra-mark"
              variant="dark"
            >
              <span className="flex size-24 items-center justify-center rounded-2xl bg-[#F6F3F1]">
                <NotraMark className="size-14 shrink-0" />
              </span>
            </BrandAssetCard>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em]">
              Wordmark
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              The mark paired with the Notra name set in Inter Semibold. On dark
              surfaces, place the mark on a cream tile. Hover a card to download
              the wordmark as SVG or PNG.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BrandAssetCard
              asset={BRAND_ASSETS.wordmark}
              copyLabel="Copy wordmark as SVG"
              downloadName="notra-wordmark"
              variant="light"
            >
              <span className="flex items-center gap-3">
                <NotraMark className="size-10 shrink-0" />
                <span className="text-3xl font-semibold text-neutral-950">
                  Notra
                </span>
              </span>
            </BrandAssetCard>
            <BrandAssetCard
              asset={BRAND_ASSETS.wordmarkDark}
              copyLabel="Copy wordmark as SVG"
              downloadName="notra-wordmark-dark"
              variant="dark"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-xl bg-[#F6F3F1]">
                  <NotraMark className="size-10 shrink-0" />
                </span>
                <span className="text-3xl font-semibold text-white">Notra</span>
              </span>
            </BrandAssetCard>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em]">
              Colors
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Our palette pairs a violet primary with the lavender, ink, and
              cream of the mark. Click a swatch to copy its hex value.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {BRAND_COLORS.map((color) => (
              <BrandColorSwatch color={color} key={color.name} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em]">
              Typography
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Inter carries UI, body, and the product. Satoshi is the marketing
              display face. Instrument Serif is a scarce editorial accent.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {BRAND_FONTS.map((font) => (
              <div
                className="border-border/70 bg-background flex flex-col gap-4 rounded-2xl border p-6"
                key={font.name}
              >
                <span
                  className={`${font.fontClassName} text-foreground text-6xl`}
                >
                  Aa
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-sm font-medium">
                    {font.name}
                  </span>
                  <span className="text-muted-foreground text-xs leading-5">
                    {font.role}
                  </span>
                </div>
                <p
                  className={`${font.fontClassName} text-foreground/80 text-lg leading-7`}
                >
                  {FONT_SAMPLE}
                </p>
                <a
                  className="text-primary text-sm underline-offset-4 hover:underline"
                  href={font.googleFontsUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Get {font.name} on {font.source}
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
