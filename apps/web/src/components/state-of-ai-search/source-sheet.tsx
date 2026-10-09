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
import { ReportBlock } from "@/components/state-of-ai-search/report-section";
import {
  EngineLabel,
  MutedText,
  PercentBar,
  ReportList,
  StatStrip,
} from "@/components/state-of-ai-search/report-ui";
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
  const citingPrompts = (source?.prompts ?? []).flatMap((entry) => {
    const row = report.prompts.find((item) => item.id === entry.id);
    return row
      ? [
          {
            row,
            citations: entry.citations,
            engines: report.engines.filter((engine) =>
              entry.engines.includes(engine.id)
            ),
          },
        ]
      : [];
  });
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
              <StatStrip
                stats={[
                  { label: "Cited in", value: formatPercent(source.share) },
                  { label: "Answers", value: source.citations },
                  { label: "Pages", value: source.pages.length },
                ]}
              />

              <ReportBlock
                description="Share of each assistant's answers that link to the domain."
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
                      header: "Cited in",
                      cell: (engine) => (
                        <PercentBar value={source.byEngine[engine.id]} />
                      ),
                    },
                  ]}
                  getKey={(engine) => engine.id}
                  rows={report.engines}
                />
              </ReportBlock>

              <ReportBlock
                description="The pages the assistants linked, most-cited first."
                title="Cited pages"
              >
                <ReportList
                  columns={[
                    {
                      key: "page",
                      header: "Page",
                      grow: true,
                      cell: (page) => (
                        <span className="flex min-w-0 flex-col">
                          <span>{page.title ?? pagePath(page.url)}</span>
                          <span className="text-muted-foreground text-xs">
                            {pagePath(page.url)}
                          </span>
                        </span>
                      ),
                    },
                    {
                      key: "citations",
                      header: "Answers",
                      align: "right",
                      cell: (page) => <MutedText>{page.citations}</MutedText>,
                    },
                  ]}
                  getHref={(page) => page.url}
                  getKey={(page) => page.url}
                  rows={source.pages}
                />
              </ReportBlock>

              <ReportBlock
                description={`Linked in answers to ${source.prompts.length} of ${report.prompts.length} prompts.`}
                title="Prompts that cite it"
              >
                <ReportList
                  columns={[
                    {
                      key: "prompt",
                      header: "Prompt",
                      grow: true,
                      cell: (entry) => entry.row.prompt,
                    },
                    {
                      key: "engines",
                      header: "Assistants",
                      align: "right",
                      cell: (entry) => (
                        <span className="inline-flex gap-1.5">
                          {entry.engines.map((engine) => (
                            <span key={engine.id} title={engine.label}>
                              <EngineIcon
                                className="size-3.5"
                                engine={engine.model}
                              />
                            </span>
                          ))}
                        </span>
                      ),
                    },
                    {
                      key: "answers",
                      header: "Answers",
                      align: "right",
                      cell: (entry) => (
                        <MutedText>
                          {entry.citations}/{entry.row.answers}
                        </MutedText>
                      ),
                    },
                  ]}
                  getKey={(entry) => String(entry.row.id)}
                  onSelect={
                    canStack ? (entry) => setPrompt(entry.row) : undefined
                  }
                  rows={citingPrompts}
                />
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
