"use client";

import { Calendar03Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { CtaBanner } from "@/components/landing/cta-banner";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { AiOverviewPanel } from "@/components/state-of-ai-search/ai-overview-card";
import { BrandSheet } from "@/components/state-of-ai-search/brand-sheet";
import {
  AnswerViewer,
  PromptSheet,
} from "@/components/state-of-ai-search/prompt-sheet";
import { ReportCarousel } from "@/components/state-of-ai-search/report-carousel";
import { VisibilityScatter } from "@/components/state-of-ai-search/report-scatter";
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
  EngineLabel,
  MutedText,
  ReportList,
} from "@/components/state-of-ai-search/report-ui";
import { SourceSheet } from "@/components/state-of-ai-search/source-sheet";
import {
  REPORT_SURFACE_LIFT,
  STATE_OF_AI_SEARCH_CTA_HEADING,
  STATE_OF_AI_SEARCH_CTA_SUBCOPY,
  STATE_OF_AI_SEARCH_PATH,
  STATE_OF_AI_SEARCH_SIGNUP_SOURCE,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchReport,
  StateOfAiSearchSource,
  StateOfAiSearchSummary,
} from "@/types/state-of-ai-search";
import {
  engineNames,
  formatReportDate,
  reportPath,
} from "@/utils/state-of-ai-search";

const TIE_POINTS = 2;
const PODIUM_SIZE = 3;

/** Podium order: second on the left, first in the middle, third on the right. */
const PODIUM_ORDER = [1, 0, 2] as const;

/**
 * The top three as a podium in the headline: first place in the middle,
 * larger and in front, second and third smaller and tucked behind it.
 */
function PodiumLogos({ leaders }: { leaders: StateOfAiSearchRankingRow[] }) {
  return (
    <span
      aria-label={`Top ${leaders.length}: ${leaders.map((row) => row.name).join(", ")}`}
      className="relative inline-flex translate-y-[0.08em] items-center self-center"
      role="img"
    >
      {PODIUM_ORDER.flatMap((rank) => {
        const row = leaders[rank];
        if (!row) {
          return [];
        }
        const first = rank === 0;
        return [
          <span
            className={cn(
              "relative inline-flex rounded-[0.24em] ring-[0.06em] ring-[#efe9fb] dark:ring-[#2a2140]",
              first ? "z-10 shadow-[0_0.04em_0.12em_rgb(0_0_0/0.25)]" : "z-0",
              rank === 1 && "-mr-[0.3em] -rotate-[8deg]",
              rank === 2 && "-ml-[0.3em] rotate-[8deg]"
            )}
            key={row.name}
          >
            <CompetitorLogo
              className={cn(
                "rounded-[0.2em] bg-white",
                first ? "size-[0.8em]" : "size-[0.62em]"
              )}
              domain={row.domain}
              name={row.name}
            />
          </span>,
        ];
      })}
    </span>
  );
}

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
  const [brandsPage, setBrandsPage] = useState(1);
  const [brand, setBrand] = useState<StateOfAiSearchRankingRow | null>(null);
  const [prompt, setPrompt] = useState<StateOfAiSearchPromptRow | null>(null);
  const [source, setSource] = useState<StateOfAiSearchSource | null>(null);
  const csvHref = `${reportPath(report.slug, report.edition)}/data.csv`;
  const brandsShared = { page: brandsPage, onPageChange: setBrandsPage };
  const headPrompt =
    report.prompts.find((row) => row.prompt === report.overview?.query) ??
    report.prompts[0];

  const sourcesDescription =
    "Share of answers linking to the domain, averaged across the assistants. Click a domain for its pages, prompts and the split by assistant.";
  const sourcesTable = (
    <SourcesTable
      engines={report.engines}
      onSelect={setSource}
      rows={report.sources}
    />
  );
  // Cited sources do not depend on Google showing an overview.
  let sourcesBlock: ReactNode = null;
  if (report.overview) {
    sourcesBlock = (
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
          description: sourcesDescription,
          children: sourcesTable,
        }}
      />
    );
  } else if (report.sources.length > 0) {
    sourcesBlock = (
      <ReportBlock description={sourcesDescription} title="Cited sources">
        {sourcesTable}
      </ReportBlock>
    );
  }

  const openBrand = (row: StateOfAiSearchRankingRow) => setBrand(row);
  const openPrompt = (row: StateOfAiSearchPromptRow) => setPrompt(row);

  return (
    <div
      className={cn(
        REPORT_SURFACE_LIFT,
        "flex w-full flex-col items-center gap-16 pb-16 antialiased [font-synthesis:none] md:gap-20 md:pb-24"
      )}
    >
      <MarketingHeroWash
        subtitle={heroSubtitle(report)}
        title={
          <>
            Who wins{" "}
            <span className="inline-flex items-baseline gap-[0.18em] whitespace-nowrap">
              <PodiumLogos leaders={report.ranking.slice(0, PODIUM_SIZE)} />
              <span className="text-primary">{report.subject}</span>
            </span>{" "}
            in AI search?
          </>
        }
      >
        <CtaButton
          nativeButton={false}
          render={<a aria-label="Download data" download href={csvHref} />}
          variant="primary"
        >
          <HugeiconsIcon icon={Download04Icon} />
          Download data
        </CtaButton>
        <CtaButton
          nativeButton={false}
          render={<Link to={STATE_OF_AI_SEARCH_PATH} />}
          variant="light"
        >
          <HugeiconsIcon icon={Calendar03Icon} />
          <time dateTime={report.publishedAt}>
            {formatReportDate(report.publishedAt)}
          </time>
        </CtaButton>
      </MarketingHeroWash>

      <div className="flex w-full max-w-[72rem] flex-col gap-12 px-4 sm:px-6">
        <ReportPair
          left={{
            title: "Visibility",
            description: `Share of answers naming the brand, averaged across the ${report.engines.length} assistants. Click a brand for details.`,
            children: (
              <RankingTable
                onSelect={openBrand}
                rows={report.ranking}
                shared={brandsShared}
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
                onSelect={openBrand}
                rows={report.ranking}
                shared={brandsShared}
              />
            ),
          }}
        />

        <ReportBlock
          description="The questions we asked and the brands in the answers. Click a prompt to read them."
          title="Prompts"
        >
          <PromptsTable onSelect={openPrompt} rows={report.prompts} />
        </ReportBlock>

        <ReportBlock
          description="How often each brand is named against how often it is named first. Top right is the assistants' default pick."
          title="Named vs. named first"
        >
          <VisibilityScatter onSelect={openBrand} rows={report.ranking} />
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

        {sourcesBlock}

        <ReportBlock
          description="Every prompt is asked to each assistant several times with web search on. A brand's rate is the share of answers that name it, and every assistant counts the same however many answers it gave. Google's AI Overview is checked once per prompt and only where Google showed one. Read the answers shows the first answer from each assistant."
          title="Method"
        >
          <ReportList
            columns={[
              {
                key: "assistant",
                header: "Assistant",
                grow: true,
                cell: (engine) => <EngineLabel engine={engine} />,
              },
              {
                key: "model",
                header: "Model",
                cell: (engine) => (
                  <MutedText>
                    {engine.id === "ai-overview"
                      ? "Google Search"
                      : engine.model}
                  </MutedText>
                ),
              },
              {
                key: "answers",
                header: "Answers",
                align: "right",
                cell: (engine) => <MutedText>{engine.answers}</MutedText>,
              },
            ]}
            getKey={(engine) => engine.id}
            rows={report.engines}
          />
        </ReportBlock>

        {otherReports.length > 0 ? (
          <ReportBlock
            description="The leaders in every other category. Swipe through or open a report."
            title="More reports"
          >
            <ReportCarousel reports={otherReports} />
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
      <SourceSheet
        onClose={() => setSource(null)}
        report={report}
        source={source}
      />
    </div>
  );
}
