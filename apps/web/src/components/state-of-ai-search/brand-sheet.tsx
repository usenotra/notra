"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { DetailSheetContent } from "@notra/ui/components/ui/detail-sheet";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useRetainedValue } from "@notra/ui/hooks/use-retained-value";
import { useState } from "react";

import { PromptSheet } from "@/components/state-of-ai-search/prompt-sheet";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import {
  EngineLabel,
  MutedText,
  PercentBar,
  ReportList,
  StatStrip,
} from "@/components/state-of-ai-search/report-ui";
import {
  BRAND_SHEET_PROMPTS,
  MAX_SHEET_DEPTH,
  REPORT_SURFACE_LIFT,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchReport,
} from "@/types/state-of-ai-search";
import {
  brandColor,
  formatPercent,
  formatShortDate,
} from "@/utils/state-of-ai-search";

/**
 * The app's detail drawer for one brand. Prompts opened from here stack on
 * top of it instead of replacing it.
 */
export function BrandSheet({
  report,
  brand: brandProp,
  onClose,
  depth = 1,
}: {
  report: StateOfAiSearchReport;
  brand: StateOfAiSearchRankingRow | null;
  onClose: () => void;
  depth?: number;
}) {
  const [brand, releaseBrand] = useRetainedValue(brandProp);
  const [prompt, setPrompt] = useState<StateOfAiSearchPromptRow | null>(null);
  const canStack = depth < MAX_SHEET_DEPTH;
  const prompts = brand
    ? report.prompts
        .filter((row) => (row.mentions[brand.name] ?? 0) > 0)
        .toSorted(
          (a, b) =>
            (b.mentions[brand.name] ?? 0) / b.answers -
            (a.mentions[brand.name] ?? 0) / a.answers
        )
    : [];
  const missing = brand
    ? report.prompts.filter((row) => !row.mentions[brand.name]).length
    : 0;
  const quotes = brand ? (report.quotes[brand.name] ?? []) : [];

  return (
    <Sheet
      onOpenChange={(open) => !open && onClose()}
      onOpenChangeComplete={(open) => {
        releaseBrand(open);
        if (!open) {
          setPrompt(null);
        }
      }}
      open={brandProp !== null}
    >
      <DetailSheetContent className={REPORT_SURFACE_LIFT} size="md">
        {brand ? (
          <>
            <SheetHeader className="shrink-0 border-b p-4">
              <div className="flex items-center gap-3 pr-8">
                <CompetitorLogo
                  className="size-9 rounded-lg"
                  domain={brand.domain}
                  name={brand.name}
                />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{brand.name}</SheetTitle>
                  <SheetDescription>
                    #{brand.rank} of {report.ranking.length} {report.noun}s ·{" "}
                    <a
                      className="hover:text-foreground underline-offset-4 hover:underline"
                      href={`https://${brand.domain}`}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                    >
                      {brand.domain}
                    </a>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <SheetScrollArea className="flex flex-col gap-8">
              <StatStrip
                stats={[
                  {
                    label: "Visibility",
                    value: formatPercent(brand.visibility),
                  },
                  { label: "Named first", value: formatPercent(brand.topPick) },
                  {
                    label: "Own site cited",
                    value: formatPercent(brand.ownSiteCited),
                  },
                ]}
              />

              <ReportBlock
                description="Share of each assistant's answers that name the brand."
                title="By assistant"
              >
                <ReportList
                  columns={[
                    {
                      key: "engine",
                      header: "Assistant",
                      grow: true,
                      cell: (engine) => <EngineLabel engine={engine} />,
                    },
                    {
                      key: "rate",
                      header: "Mention rate",
                      cell: (engine) => (
                        <PercentBar
                          color={brandColor(brand.rank)}
                          value={brand.byEngine[engine.id]}
                        />
                      ),
                    },
                  ]}
                  getKey={(engine) => engine.id}
                  rows={report.engines}
                />
              </ReportBlock>

              <ReportBlock
                description={
                  missing > 0
                    ? `Named in ${prompts.length} of ${report.prompts.length} prompts. Missing from ${missing}.`
                    : `Named in every prompt.`
                }
                title="Where it shows up"
              >
                <ReportList
                  columns={[
                    {
                      key: "prompt",
                      header: "Prompt",
                      grow: true,
                      cell: (row) => row.prompt,
                    },
                    {
                      key: "named",
                      header: "Named",
                      align: "right",
                      cell: (row) => (
                        <span className="tabular-nums">
                          {row.mentions[brand.name] ?? 0}/{row.answers}
                        </span>
                      ),
                    },
                    {
                      key: "first",
                      header: "First",
                      align: "right",
                      cell: (row) => (
                        <MutedText>{row.firsts[brand.name] ?? 0}</MutedText>
                      ),
                    },
                  ]}
                  getKey={(row) => String(row.id)}
                  onSelect={canStack ? setPrompt : undefined}
                  rows={prompts.slice(0, BRAND_SHEET_PROMPTS)}
                />
              </ReportBlock>

              {quotes.length > 0 ? (
                <ReportBlock
                  description="Lines from the answers, word for word."
                  title="What AI says"
                >
                  <div className="flex flex-col gap-3">
                    {quotes.map((quote) => {
                      const engine = report.engines.find(
                        (item) => item.id === quote.engine
                      );
                      return (
                        <ReportPanel
                          bodyClassName="flex flex-col gap-2 p-4"
                          header={
                            <>
                              {engine ? (
                                <EngineIcon
                                  className="size-3.5"
                                  engine={engine.model}
                                />
                              ) : null}
                              <span className="text-foreground">
                                {engine?.label}
                              </span>
                              <span className="truncate font-normal">
                                · “{quote.prompt}”
                              </span>
                              <time
                                className="ml-auto shrink-0 text-xs font-normal"
                                dateTime={quote.collectedAt}
                              >
                                {formatShortDate(quote.collectedAt)}
                              </time>
                            </>
                          }
                          key={`${quote.engine}-${quote.prompt}`}
                        >
                          <blockquote className="text-sm/6 text-pretty">
                            {quote.text}
                          </blockquote>
                        </ReportPanel>
                      );
                    })}
                  </div>
                </ReportBlock>
              ) : null}
            </SheetScrollArea>
          </>
        ) : null}
        {canStack ? (
          <PromptSheet
            depth={depth + 1}
            onClose={() => setPrompt(null)}
            prompt={prompt}
            report={report}
          />
        ) : null}
      </DetailSheetContent>
    </Sheet>
  );
}
