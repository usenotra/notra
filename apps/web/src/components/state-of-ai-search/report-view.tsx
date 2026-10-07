import { Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { CtaBanner } from "@/components/landing/cta-banner";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { AiOverviewCard } from "@/components/state-of-ai-search/ai-overview-card";
import { QuoteGrid } from "@/components/state-of-ai-search/quote-grid";
import { ReportCards } from "@/components/state-of-ai-search/report-cards";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import {
  EngineTable,
  PromptsTable,
  RankingTable,
  SourcesTable,
} from "@/components/state-of-ai-search/report-tables";
import {
  STATE_OF_AI_SEARCH_CTA_HEADING,
  STATE_OF_AI_SEARCH_CTA_SUBCOPY,
  STATE_OF_AI_SEARCH_PATH,
  STATE_OF_AI_SEARCH_SIGNUP_SOURCE,
} from "@/constants/state-of-ai-search";
import type { StateOfAiSearchReport } from "@/types/state-of-ai-search";
import {
  engineNames,
  formatReportDate,
  reportPath,
} from "@/utils/state-of-ai-search";

const TIE_POINTS = 2;

function heroSubtitle(report: StateOfAiSearchReport): string {
  const [first, second] = report.ranking;
  const lead =
    first && second && first.visibility - second.visibility <= TIE_POINTS
      ? `${first.name} and ${second.name} are tied at the top.`
      : `${first?.name ?? "Nobody"} comes out on top.`;
  return `We asked ${engineNames(report)} ${report.totals.prompts} questions about ${report.noun}s. ${lead}`;
}

export function ReportView({
  report,
  otherReports,
}: {
  report: StateOfAiSearchReport;
  otherReports: StateOfAiSearchReport[];
}) {
  const leader = report.ranking[0];
  const csvHref = `${reportPath(report.slug, report.edition)}/data.csv`;
  const { answers } = report.totals;

  return (
    <div className="flex w-full flex-col items-center gap-16 pb-16 antialiased [font-synthesis:none] md:gap-20 md:pb-24">
      <MarketingHeroWash
        subtitle={heroSubtitle(report)}
        title={
          <>
            Who wins <span className="text-primary">{report.subject}</span> in
            AI search?
          </>
        }
      >
        <CtaButton
          nativeButton={false}
          render={<a download href={csvHref} />}
          variant="light"
        >
          <HugeiconsIcon icon={Download04Icon} />
          Download data
        </CtaButton>
        <p className="flex items-center gap-2 text-sm text-[#1E1E1EBF] dark:text-white/70">
          <Link
            className="underline-offset-4 hover:underline"
            to={STATE_OF_AI_SEARCH_PATH}
          >
            State of AI Search
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={report.publishedAt}>
            {formatReportDate(report.publishedAt)}
          </time>
        </p>
      </MarketingHeroWash>

      <div className="flex w-full max-w-[72rem] flex-col gap-12 px-4 sm:px-6">
        <div className="grid gap-x-6 gap-y-12 lg:grid-cols-2">
          <ReportBlock
            description={`Share of ${answers} answers that name each of the ${report.ranking.length} brands, averaged over the assistants.`}
            title="Visibility"
          >
            <RankingTable rows={report.ranking} />
          </ReportBlock>
          <ReportBlock
            description="Share of each assistant's answers. Bold is the brand it names most."
            title="By assistant"
          >
            <EngineTable engines={report.engines} rows={report.ranking} />
          </ReportBlock>
        </div>

        <ReportBlock
          description="The questions we asked, every brand in the answers and the one named first."
          readout={`${report.prompts.length} prompts`}
          title="Prompts"
        >
          <PromptsTable rows={report.prompts} />
        </ReportBlock>

        <div className="grid items-start gap-x-6 gap-y-12 lg:grid-cols-2">
          {report.overview ? (
            <ReportBlock
              description="Google's answer above the results, from a US desktop search."
              title="AI Overview"
            >
              <ReportPanel
                header={
                  <>
                    <EngineIcon
                      className="size-3.5"
                      engine="google/ai-overview"
                    />
                    <span className="text-foreground truncate">
                      “{report.overview.query}”
                    </span>
                  </>
                }
              >
                <AiOverviewCard overview={report.overview} />
              </ReportPanel>
            </ReportBlock>
          ) : null}
          <ReportBlock
            description={`Share of answers that link to the domain. ${report.totals.citedDomains} domains cited in total.`}
            title="Cited sources"
          >
            <SourcesTable engines={report.engines} rows={report.sources} />
          </ReportBlock>
        </div>

        {leader && report.quotes.length > 0 ? (
          <ReportBlock
            description="Lines from today's answers, word for word."
            title={`What AI says about ${leader.name}`}
          >
            <QuoteGrid
              brand={leader.name}
              engines={report.engines}
              quotes={report.quotes}
            />
          </ReportBlock>
        ) : null}

        <ReportBlock title="Methodology">
          <ReportPanel bodyClassName="text-muted-foreground grid gap-6 p-4 text-sm/6 text-pretty md:grid-cols-3">
            <p>
              <span className="text-foreground block font-medium">
                What we asked
              </span>
              On {formatReportDate(report.publishedAt)} each prompt went to
              ChatGPT and Claude twice, both with web search on, and once to a
              US Google search for its AI Overview.
            </p>
            <p>
              <span className="text-foreground block font-medium">
                How we count
              </span>
              A brand counts when its name or an alias appears as a whole word.
              Visibility averages the assistants, so none of them outweighs the
              others.
            </p>
            <p>
              <span className="text-foreground block font-medium">
                How to read it
              </span>
              Answers change from run to run, so a few points are noise. Every
              number is in the{" "}
              <a
                className="text-foreground underline underline-offset-4"
                download
                href={csvHref}
              >
                CSV
              </a>
              .
            </p>
          </ReportPanel>
        </ReportBlock>

        {otherReports.length > 0 ? (
          <ReportBlock title="More reports">
            <ReportCards reports={otherReports} />
          </ReportBlock>
        ) : null}
      </div>

      <div className="w-full px-4 sm:px-6">
        <CtaBanner
          heading={STATE_OF_AI_SEARCH_CTA_HEADING}
          signupSource={STATE_OF_AI_SEARCH_SIGNUP_SOURCE}
          subcopy={STATE_OF_AI_SEARCH_CTA_SUBCOPY}
        />
      </div>
    </div>
  );
}
