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
  MAX_SHEET_DEPTH,
  REPORT_SURFACE_LIFT,
} from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchPromptRow,
  StateOfAiSearchReport,
  StateOfAiSearchSource,
} from "@/types/state-of-ai-search";
import { formatPercent } from "@/utils/state-of-ai-search";

const PERCENT_MAX = 100;

/** Path of a cited page, for a compact second line under its title. */
function pagePath(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * The app's detail drawer for one cited domain: how often each assistant
 * links it, which pages, and for which prompts. Prompts stack on top.
 */
export function SourceSheet({
  report,
  source: sourceProp,
  onClose,
  depth = 1,
}: {
  report: StateOfAiSearchReport;
  source: StateOfAiSearchSource | null;
  onClose: () => void;
  depth?: number;
}) {
  const [source, releaseSource] = useRetainedValue(sourceProp);
  const [prompt, setPrompt] = useState<StateOfAiSearchPromptRow | null>(null);
  const promptEngine = source?.prompts.find((entry) => entry.id === prompt?.id)
    ?.engines[0];
  const canStack = depth < MAX_SHEET_DEPTH;
  const rank = source
    ? report.sources.findIndex((item) => item.domain === source.domain) + 1
    : 0;

  return (
    <Sheet
      onOpenChange={(open) => !open && onClose()}
      onOpenChangeComplete={(open) => {
        releaseSource(open);
        if (!open) {
          setPrompt(null);
        }
      }}
      open={sourceProp !== null}
    >
      <DetailSheetContent className={REPORT_SURFACE_LIFT} size="md">
        {source ? (
          <>
            <SheetHeader className="shrink-0 border-b p-4">
              <div className="flex items-center gap-3 pr-8">
                <CompetitorLogo
                  className="size-9 rounded-lg"
                  domain={source.domain}
                  name={source.domain}
                />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{source.domain}</SheetTitle>
                  <SheetDescription>
                    #{rank} most cited ·{" "}
                    <a
                      className="hover:text-foreground underline-offset-4 hover:underline"
                      href={`https://${source.domain}`}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                    >
                      Open site
                    </a>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <SheetScrollArea className="flex flex-col gap-8">
              <ReportPanel bodyClassName="grid grid-cols-3 divide-x divide-border/60">
                {[
                  { label: "Cited in", value: formatPercent(source.share) },
                  { label: "Answers", value: String(source.citations) },
                  { label: "Pages", value: String(source.pages.length) },
                ].map((stat) => (
                  <div
                    className="flex flex-col gap-1 px-4 py-3"
                    key={stat.label}
                  >
                    <span className="text-muted-foreground text-xs">
                      {stat.label}
                    </span>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </ReportPanel>

              <ReportBlock
                description="Share of each assistant's answers that link to the domain."
                title="By assistant"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assistant</TableHead>
                      <TableHead>Cited in</TableHead>
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
                              max={PERCENT_MAX}
                              value={source.byEngine[engine.id] ?? 0}
                            />
                            <span className="w-9 text-right font-medium tabular-nums">
                              {formatPercent(source.byEngine[engine.id])}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ReportBlock>

              <ReportBlock
                description="The pages the assistants linked, most-cited first."
                title="Cited pages"
              >
                <ReportPanel>
                  <ul className="divide-border/60 divide-y">
                    {source.pages.map((page) => (
                      <li key={page.url}>
                        <a
                          className="hover:bg-muted/50 flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors"
                          href={page.url}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm">
                              {page.title ?? pagePath(page.url)}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {pagePath(page.url)}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {page.citations}×
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </ReportPanel>
              </ReportBlock>

              <ReportBlock
                description={`Linked in answers to ${source.prompts.length} of ${report.prompts.length} prompts.`}
                title="Prompts that cite it"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="text-right">Assistants</TableHead>
                      <TableHead className="text-right">Answers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {source.prompts.map((entry) => {
                      const row = report.prompts.find(
                        (item) => item.id === entry.id
                      );
                      if (!row) {
                        return null;
                      }
                      return (
                        <TableRow
                          className={canStack ? "cursor-pointer" : undefined}
                          key={entry.id}
                          onClick={canStack ? () => setPrompt(row) : undefined}
                        >
                          <TableCell className="w-full py-3 text-pretty whitespace-normal">
                            {row.prompt}
                          </TableCell>
                          <TableCell>
                            <span className="flex justify-end gap-1.5">
                              {entry.engines.map((engineId) => {
                                const engine = report.engines.find(
                                  (item) => item.id === engineId
                                );
                                return engine ? (
                                  <span key={engineId} title={engine.label}>
                                    <EngineIcon
                                      className="size-3.5"
                                      engine={engine.model}
                                    />
                                  </span>
                                ) : null;
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right tabular-nums">
                            {entry.citations}/{row.answers}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ReportBlock>
            </SheetScrollArea>
          </>
        ) : null}
        {canStack ? (
          <PromptSheet
            depth={depth + 1}
            initialEngine={promptEngine}
            onClose={() => setPrompt(null)}
            prompt={prompt}
            report={report}
          />
        ) : null}
      </DetailSheetContent>
    </Sheet>
  );
}
