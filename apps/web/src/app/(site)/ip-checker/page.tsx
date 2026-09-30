import { Effect } from "effect";
import type { Metadata } from "next";

import { CrawlerListsTable } from "@/components/ip-checker/crawler-lists-table";
import { IpCheckerTool } from "@/components/ip-checker/ip-checker-tool";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import {
  IP_CHECKER_DESCRIPTION,
  IP_CHECKER_HERO_SUBTITLE,
  IP_CHECKER_SAMPLES,
  IP_CHECKER_TITLE,
  IP_CHECKER_URL,
} from "@/constants/ip-checker";
import { parseIp } from "@/lib/ip-checker/cidr";
import {
  buildIpCheckResult,
  loadCrawlerIpLists,
  summarizeCrawlerIpLists,
} from "@/lib/ip-checker/sources";
import type { IpCheckerPageProps } from "@/types/ip-checker";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  DEFAULT_SOCIAL_IMAGE,
  pageAlternates,
  TWITTER_HANDLE,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = IP_CHECKER_TITLE;
const description = IP_CHECKER_DESCRIPTION;
const url = IP_CHECKER_URL;

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
  { name: title, url },
]);

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: title,
  url,
  applicationCategory: "DeveloperApplication",
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

export default async function IpCheckerPage({
  searchParams,
}: IpCheckerPageProps) {
  const { ip } = await searchParams;
  const initialIp = typeof ip === "string" ? ip : undefined;
  const parsedIp = initialIp ? parseIp(initialIp) : null;
  const lists = await Effect.runPromise(loadCrawlerIpLists());
  const initialResult = parsedIp ? buildIpCheckResult(lists, parsedIp) : null;
  const summaries = summarizeCrawlerIpLists(lists);

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
          subtitle={IP_CHECKER_HERO_SUBTITLE}
          title={
            <>
              Is this IP an <span className="text-primary">AI crawler</span>?
            </>
          }
        />

        <div className="flex w-full max-w-[64rem] flex-col gap-10 px-4 sm:px-6 md:gap-12">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-2 sm:p-4 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
            <div className="bg-background rounded-2xl border border-[#1E1E1E0D] p-4 sm:p-6 dark:border-white/5">
              <IpCheckerTool
                initialIp={initialIp}
                initialResult={initialResult}
                samples={IP_CHECKER_SAMPLES}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>Lists we check</h2>
            <p className={bodyClass}>
              Every range comes straight from the vendor. Lists are refreshed
              hourly, so a new address shows up here as soon as the vendor
              publishes it.
            </p>
            <CrawlerListsTable lists={summaries} />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>What a match means</h2>
            <p className={bodyClass}>
              A hit tells you the address is owned by that vendor and used by
              the crawlers listed. It cannot tell you which of them made a given
              request when several share a range, so pair it with the user agent
              from the same log line.
            </p>
            <p className={bodyClass}>
              No match is not proof of a human. Coding agents, browser
              extensions and many assistants fetch pages from ordinary cloud or
              residential addresses and never publish them. Notra tracks those
              by request fingerprint instead of IP.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
