import type { Metadata } from "next";

import { FeedbackMdAdopters } from "@/components/feedback-md/feedback-md-adopters";
import { FeedbackMdAnatomy } from "@/components/feedback-md/feedback-md-anatomy";
import { FeedbackMdFaq } from "@/components/feedback-md/feedback-md-faq";
import { FeedbackMdHero } from "@/components/feedback-md/feedback-md-hero";
import { FeedbackMdPrinciples } from "@/components/feedback-md/feedback-md-principles";
import { FeedbackMdSection } from "@/components/feedback-md/feedback-md-section";
import { FeedbackMdSiblingsTable } from "@/components/feedback-md/feedback-md-siblings-table";
import { FeedbackMdSteps } from "@/components/feedback-md/feedback-md-steps";
import { FeedbackMdTerminalDemo } from "@/components/feedback-md/feedback-md-terminal-demo";
import { FeedbackMdUpsell } from "@/components/feedback-md/feedback-md-upsell";
import {
  FEEDBACK_MD_DESCRIPTION,
  FEEDBACK_MD_PAGE_PATH,
  FEEDBACK_MD_TITLE,
} from "@/lib/feedback-md/constants";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/utils/jsonld";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = FEEDBACK_MD_TITLE;
const description = FEEDBACK_MD_DESCRIPTION;
const url = `${SITE_URL}${FEEDBACK_MD_PAGE_PATH}`;

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "feedback.md", url },
]);

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
    images: [PAGE_SOCIAL_IMAGES.feedbackMd],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.feedbackMd.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

export default function FeedbackMdPage() {
  return (
    <div className="flex w-full flex-col items-center gap-8 pb-14 antialiased [font-synthesis:none]">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <FeedbackMdHero />
      <div className="flex w-[min(100%-3rem,62.5rem)] flex-col gap-14 pt-6">
        <FeedbackMdTerminalDemo />

        <FeedbackMdAdopters />

        <FeedbackMdSection
          description={FEEDBACK_MD_DESCRIPTION}
          title={
            <>
              What is{" "}
              <code className="rounded-md bg-[#1E1E1E0A] px-2 py-0.5 font-mono text-[0.85em] font-medium tracking-normal dark:bg-white/10">
                feedback.md
              </code>
            </>
          }
        >
          <FeedbackMdPrinciples />
        </FeedbackMdSection>

        <FeedbackMdSection
          description="The whole file fits on one screen. Four headings, plain sentences and links an agent can follow. One is required. The rest make the feedback better."
          title="Anatomy of a feedback.md"
        >
          <FeedbackMdAnatomy />
        </FeedbackMdSection>

        <FeedbackMdSection
          description="Every file agents read today points one way. The site tells the agent what to read, how to sign in and how things should look. feedback.md points back."
          title="Where it sits"
        >
          <FeedbackMdSiblingsTable />
        </FeedbackMdSection>

        <FeedbackMdSection
          description="Paste this into your agent. It reads this page, asks you where feedback should go and writes the file."
          title="Add it to your site"
        >
          <FeedbackMdSteps />
        </FeedbackMdSection>

        <FeedbackMdSection
          description="Short answers to the questions we got while writing ours."
          title="Questions"
        >
          <FeedbackMdFaq />
        </FeedbackMdSection>
      </div>
      <div className="w-full pt-6">
        <FeedbackMdUpsell />
      </div>
    </div>
  );
}
