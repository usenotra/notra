import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { cn } from "@notra/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

import { CtaBanner } from "@/components/landing/cta-banner";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { ReportCards } from "@/components/state-of-ai-search/report-cards";
import { ReportBlock } from "@/components/state-of-ai-search/report-section";
import {
  REPORT_SURFACE_LIFT,
  STATE_OF_AI_SEARCH_CTA_HEADING,
  STATE_OF_AI_SEARCH_CTA_SUBCOPY,
  STATE_OF_AI_SEARCH_DESCRIPTION,
  STATE_OF_AI_SEARCH_SIGNUP_SOURCE,
  STATE_OF_AI_SEARCH_TITLE,
  STATE_OF_AI_SEARCH_URL,
} from "@/constants/state-of-ai-search";
import { listLatestSummaries } from "@/lib/state-of-ai-search/reports";
import { buildHead } from "@/utils/head";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import { DEFAULT_SOCIAL_IMAGE, TWITTER_HANDLE } from "@/utils/metadata";
import { formatReportDate } from "@/utils/state-of-ai-search";
import { SITE_URL } from "@/utils/urls";

const title = STATE_OF_AI_SEARCH_TITLE;
const description = STATE_OF_AI_SEARCH_DESCRIPTION;
const url = STATE_OF_AI_SEARCH_URL;

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: title, url },
]);

export const Route = createFileRoute("/_site/state-of-ai-search/")({
  loader: () => listLatestSummaries(),
  head: () =>
    buildHead({
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
    }),
  component: StateOfAiSearchIndexPage,
});

function StateOfAiSearchIndexPage() {
  const reports = Route.useLoaderData();
  const [latest] = reports;
  const engines = latest?.engines ?? [];

  return (
    <div
      className={cn(REPORT_SURFACE_LIFT, "flex w-full flex-col items-center")}
    >
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <section className="flex w-full flex-col items-center gap-12 pb-16 antialiased [font-synthesis:none] md:gap-16 md:pb-24">
        <MarketingHeroWash
          subtitle="Which brands do AI assistants recommend? Every month we ask them the questions buyers ask, category by category, and publish what they say."
          title={
            <>
              State of <span className="text-primary">AI Search</span>
            </>
          }
        >
          <div className="flex flex-col items-center gap-3">
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {engines.map((engine) => (
                <li
                  className="bg-background/80 inline-flex items-center gap-1.5 rounded-full border border-[#1E1E1E14] px-3 py-1 text-sm font-medium dark:border-white/10"
                  key={engine.id}
                >
                  <EngineIcon engine={engine.model} />
                  {engine.label}
                </li>
              ))}
            </ul>
            {latest ? (
              <p className="text-sm text-[#1E1E1EBF] dark:text-white/70">
                Updated{" "}
                <time dateTime={latest.publishedAt}>
                  {formatReportDate(latest.publishedAt)}
                </time>
              </p>
            ) : null}
          </div>
        </MarketingHeroWash>

        <div className="flex w-full max-w-[72rem] flex-col px-4 sm:px-6">
          <ReportBlock
            description="Each report ranks the brands by how often ChatGPT, Claude and Google's AI Overview name them."
            readout={`${reports.length} categories`}
            title={latest ? `${latest.editionLabel} reports` : "Reports"}
          >
            <ReportCards reports={reports} />
          </ReportBlock>
        </div>

        <div className="w-full px-4 sm:px-6">
          <CtaBanner
            heading={STATE_OF_AI_SEARCH_CTA_HEADING}
            signupSource={STATE_OF_AI_SEARCH_SIGNUP_SOURCE}
            subcopy={STATE_OF_AI_SEARCH_CTA_SUBCOPY}
          />
        </div>
      </section>
    </div>
  );
}
