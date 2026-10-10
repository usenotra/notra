import { createFileRoute } from "@tanstack/react-router";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { OfferingCheckForm } from "@/components/offering-check/offering-check-form";
import {
  OFFERING_CHECK_HERO_SUBTITLE,
  OFFERING_CHECK_SAMPLES,
} from "@/constants/offering-check";
import {
  OFFERING_CHECK_BREADCRUMB_JSONLD,
  OFFERING_CHECK_METADATA,
  OFFERING_CHECK_SOFTWARE_JSONLD,
} from "@/constants/offering-check-page";
import {
  OFFERING_BODY_CLASS,
  OFFERING_SECTION_TITLE_CLASS,
} from "@/constants/offering-check-styles";
import { buildHead } from "@/utils/head";
import { serializeJsonLd } from "@/utils/jsonld";

export const Route = createFileRoute("/_site/offering/")({
  head: () => buildHead(OFFERING_CHECK_METADATA),
  component: OfferingCheckPage,
});

function OfferingCheckPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(OFFERING_CHECK_BREADCRUMB_JSONLD),
        }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(OFFERING_CHECK_SOFTWARE_JSONLD),
        }}
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
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-2 sm:rounded-[2rem] sm:p-3 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
            <div className="bg-background rounded-2xl border border-[#1E1E1E0D] p-5 sm:rounded-[1.5rem] sm:p-8 dark:border-white/5">
              <OfferingCheckForm samples={OFFERING_CHECK_SAMPLES} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={OFFERING_SECTION_TITLE_CLASS}>
              Memory or web search
            </h2>
            <p className={OFFERING_BODY_CLASS}>
              By default the model answers from what it learned in training,
              which is how assistants often reply when they skip the search.
              That knowledge is months old and thin on anything you shipped
              recently, so a miss here usually means the feature has not been
              written about enough yet.
            </p>
            <p className={OFFERING_BODY_CLASS}>
              Turn on web search to see whether your product pages, docs and
              changelogs change the answer and which sources the model reads.
              Search only finds pages that rank for the question, so a miss with
              search on points to pages that are hard to find.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={OFFERING_SECTION_TITLE_CLASS}>
              What to do when it does not
            </h2>
            <p className={OFFERING_BODY_CLASS}>
              Give the feature its own page with its name in the title, and say
              what it does in the first paragraph. Mention it in your changelog
              and docs, and link those pages from your homepage so crawlers
              reach them. Look at which sites the model read instead of yours.
              Those are the places where a mention moves the answer.
            </p>
            <p className={OFFERING_BODY_CLASS}>
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
