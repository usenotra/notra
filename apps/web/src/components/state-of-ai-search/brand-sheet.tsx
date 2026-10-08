"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { DetailSheetContent } from "@notra/ui/components/ui/detail-sheet";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetScrollArea,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { useRetainedValue } from "@notra/ui/hooks/use-retained-value";
import { useState } from "react";

import { PromptSheet } from "@/components/state-of-ai-search/prompt-sheet";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import {
  BRAND_SHEET_PROMPTS,
  MAX_SHEET_DEPTH,
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

const PERCENT_MAX = 100;

function StatStrip({ row }: { row: StateOfAiSearchRankingRow }) {
  const stats = [
    { label: "Visibility", value: formatPercent(row.visibility) },
    { label: "Named first", value: formatPercent(row.topPick) },
    { label: "Own site cited", value: formatPercent(row.ownSiteCited) },
  ];
  return (
    <ReportPanel bodyClassName="grid grid-cols-3 divide-x divide-border/60">
      {stats.map((stat) => (
        <div className="flex flex-col gap-1 px-4 py-3" key={stat.label}>
          <span className="text-muted-foreground text-xs">{stat.label}</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {stat.value}
          </span>
        </div>
      ))}
    </ReportPanel>
  );
}

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
      <DetailSheetContent size="md">
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
              <StatStrip row={brand} />

              <ReportBlock
                description="Share of each assistant's answers that name the brand."
                title="By assistant"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assistant</TableHead>
                      <TableHead>Mention rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.engines.map((engine) => (
                      <TableRow key={engine.id}>
                        <TableCell className="w-full">
                          <span className="flex items-center gap-2.5">
                            <EngineIcon engine={engine.model} />
                            {engine.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <GeoBar
                              className="w-20"
                              fillColor={brandColor(brand.rank)}
                              max={PERCENT_MAX}
                              value={brand.byEngine[engine.id] ?? 0}
                            />
                            <span className="w-9 text-right font-medium tabular-nums">
                              {formatPercent(brand.byEngine[engine.id])}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ReportBlock>

              <ReportBlock
                description={
                  missing > 0
                    ? `Named in ${prompts.length} of ${report.prompts.length} prompts. Missing from ${missing}.`
                    : `Named in every prompt.`
                }
                title="Where it shows up"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="text-right">Named</TableHead>
                      <TableHead className="text-right">First</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prompts.slice(0, BRAND_SHEET_PROMPTS).map((row) => (
                      <TableRow
                        className={canStack ? "cursor-pointer" : undefined}
                        key={row.id}
                        onClick={canStack ? () => setPrompt(row) : undefined}
                      >
                        <TableCell className="w-full py-3 text-pretty whitespace-normal">
                          {row.prompt}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.mentions[brand.name] ?? 0}/{row.answers}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {row.firsts[brand.name] ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
