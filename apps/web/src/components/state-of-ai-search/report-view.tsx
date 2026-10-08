"use client";

import { Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { CtaBanner } from "@/components/landing/cta-banner";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { AiOverviewPanel } from "@/components/state-of-ai-search/ai-overview-card";
import { BrandSheet } from "@/components/state-of-ai-search/brand-sheet";
import {
  AnswerViewer,
  PromptSheet,
} from "@/components/state-of-ai-search/prompt-sheet";
import { ReportCards } from "@/components/state-of-ai-search/report-cards";
import {
  ReportBlock,
  ReportPair,
} from "@/components/state-of-ai-search/report-section";
import {
  EngineHeatmap,
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
import type {
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchReport,
  StateOfAiSearchSummary,
} from "@/types/state-of-ai-search";
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
  otherReports: StateOfAiSearchSummary[];
}) {
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [brand, setBrand] = useState<StateOfAiSearchRankingRow | null>(null);
  const [prompt, setPrompt] = useState<StateOfAiSearchPromptRow | null>(null);
  const csvHref = `${reportPath(report.slug, report.edition)}/data.csv`;
  const toggleBrands = () => setBrandsExpanded((current) => !current);
  const headPrompt =
    report.prompts.find((row) => row.prompt === report.overview?.query) ??
    report.prompts[0];

  const openBrand = (row: StateOfAiSearchRankingRow) => setBrand(row);
  const openPrompt = (row: StateOfAiSearchPromptRow) => setPrompt(row);

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
        <ReportPair
          left={{
            title: "Visibility",
            description: `Share of ${report.totals.answers} answers naming the brand. Click a brand for details.`,
            children: (
              <RankingTable
                expanded={brandsExpanded}
                onSelect={openBrand}
                onToggleExpanded={toggleBrands}
                rows={report.ranking}
              />
            ),
          }}
          right={{
            title: "By assistant",
            description:
              "Share of each assistant's answers that name the brand.",
            children: (
              <EngineHeatmap
                engines={report.engines}
                expanded={brandsExpanded}
                onSelect={openBrand}
                onToggleExpanded={toggleBrands}
                rows={report.ranking}
              />
            ),
          }}
        />

        <ReportBlock
          description="The questions we asked and the brands in the answers. Click a prompt to read them."
          readout={`${report.prompts.length} prompts`}
          title="Prompts"
        >
          <PromptsTable onSelect={openPrompt} rows={report.prompts} />
        </ReportBlock>

        {headPrompt ? (
          <ReportBlock
            description={`What each assistant answered for “${headPrompt.prompt}”, word for word.`}
            title="Read the answers"
          >
            <AnswerViewer
              key={headPrompt.id}
              prompt={headPrompt}
              report={report}
            />
          </ReportBlock>
        ) : null}

        {report.overview ? (
          <ReportPair
            left={{
              title: "AI Overview",
              description:
                "Google's answer above the results, from a US desktop search.",
              children: (
                <AiOverviewPanel
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
                  overview={report.overview}
                />
              ),
            }}
            right={{
              title: "Cited sources",
              description: `Share of answers linking to the domain, out of ${report.totals.citedDomains} cited.`,
              children: (
                <SourcesTable engines={report.engines} rows={report.sources} />
              ),
            }}
          />
        ) : null}

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

      <BrandSheet
        brand={brand}
        onClose={() => setBrand(null)}
        report={report}
      />
      <PromptSheet
        onClose={() => setPrompt(null)}
        prompt={prompt}
        report={report}
      />
    </div>
  );
}
