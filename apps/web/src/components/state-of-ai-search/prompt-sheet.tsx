"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { GeoPromptAnswerThread } from "@notra/ui/components/geo/geo-prompt-answer-thread";
import { PromptEngineSwitcher } from "@notra/ui/components/geo/prompt-engine-switcher";
import { DetailSheetContent } from "@notra/ui/components/ui/detail-sheet";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
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

import { AiOverviewCard } from "@/components/state-of-ai-search/ai-overview-card";
import { BrandSheet } from "@/components/state-of-ai-search/brand-sheet";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import { Brand } from "@/components/state-of-ai-search/report-tables";
import { MAX_SHEET_DEPTH } from "@/constants/state-of-ai-search";
import type {
  StateOfAiSearchEngine,
  StateOfAiSearchEngineId,
  StateOfAiSearchPromptAnswer,
  StateOfAiSearchPromptRow,
  StateOfAiSearchRankingRow,
  StateOfAiSearchReport,
} from "@/types/state-of-ai-search";
import { formatReportDate } from "@/utils/state-of-ai-search";

type PromptSheetView = "raw" | "analysis";

function switcherItems(
  report: StateOfAiSearchReport,
  responses: StateOfAiSearchPromptAnswer[]
) {
  return responses.flatMap((response) => {
    const engine = report.engines.find((item) => item.id === response.engine);
    return engine
      ? [
          {
            engine: engine.model,
            family: engine.label,
            label: engine.label,
            showSearchIcon: false,
          },
        ]
      : [];
  });
}

/** One engine's answer in its own chat skin, or Google's overview. */
function AnswerBody({
  prompt,
  response,
  engine,
}: {
  prompt: string;
  response: StateOfAiSearchPromptAnswer;
  engine: StateOfAiSearchEngine;
}) {
  if (response.overview) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl">
          <AiOverviewCard overview={response.overview} />
        </div>
      </div>
    );
  }
  if (response.engine === "ai-overview") {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        Google showed no AI Overview for this search.
      </p>
    );
  }
  return (
    <GeoPromptAnswerThread
      key={response.engine}
      prompt={prompt}
      result={{
        engine: engine.model,
        excerpt: response.text,
        mentioned: response.mentioned.length > 0,
      }}
      timestamp={formatReportDate(response.collectedAt)}
    />
  );
}

/** Inline answer viewer for the report page: switcher on the shell, answer below. */
export function AnswerViewer({
  report,
  prompt,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow;
}) {
  const [engineId, setEngineId] = useState(prompt.responses[0]?.engine);
  const response =
    prompt.responses.find((item) => item.engine === engineId) ??
    prompt.responses[0];
  const engine = report.engines.find((item) => item.id === response?.engine);
  if (!response || !engine) {
    return null;
  }
  return (
    <ReportPanel
      bodyClassName="flex h-[32rem] flex-none flex-col overflow-hidden"
      header={
        <PromptEngineSwitcher
          active={engine.model}
          items={switcherItems(report, prompt.responses)}
          onChange={(model) =>
            setEngineId(
              report.engines.find((item) => item.model === model)?.id ??
                response.engine
            )
          }
        />
      }
    >
      <AnswerBody engine={engine} prompt={prompt.prompt} response={response} />
    </ReportPanel>
  );
}

function PromptAnalysis({
  report,
  prompt,
  onSelectBrand,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow;
  onSelectBrand?: (brand: StateOfAiSearchRankingRow) => void;
}) {
  const brands = report.ranking
    .filter((row) => (prompt.mentions[row.name] ?? 0) > 0)
    .toSorted(
      (a, b) =>
        (prompt.mentions[b.name] ?? 0) - (prompt.mentions[a.name] ?? 0) ||
        (prompt.firsts[b.name] ?? 0) - (prompt.firsts[a.name] ?? 0)
    );
  const sources = [
    ...new Set(prompt.responses.flatMap((response) => response.sources)),
  ];
  return (
    <SheetScrollArea className="flex flex-col gap-8">
      <ReportBlock
        description="Answers naming each brand, and how often it came first."
        title="Brands in the answers"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Named</TableHead>
              <TableHead className="text-right">First</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((row) => (
              <TableRow
                className={onSelectBrand ? "cursor-pointer" : undefined}
                key={row.name}
                onClick={onSelectBrand ? () => onSelectBrand(row) : undefined}
              >
                <TableCell className="w-full max-w-0">
                  <Brand domain={row.domain} name={row.name} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {prompt.mentions[row.name] ?? 0}/{prompt.answers}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {prompt.firsts[row.name] ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ReportBlock>
      {sources.length > 0 ? (
        <ReportBlock
          description="Domains the answers linked to."
          title="Sources"
        >
          <ReportPanel bodyClassName="flex flex-wrap gap-2 p-3">
            {sources.map((domain) => (
              <a
                className="border-border hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs font-medium transition-colors"
                href={`https://${domain}`}
                key={domain}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <CompetitorLogo
                  className="size-4 rounded-full"
                  domain={domain}
                  name={domain}
                />
                {domain}
              </a>
            ))}
          </ReportPanel>
        </ReportBlock>
      ) : null}
    </SheetScrollArea>
  );
}

function PromptSheetBody({
  report,
  prompt,
  depth,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow;
  depth: number;
}) {
  const [engineId, setEngineId] = useState<StateOfAiSearchEngineId | undefined>(
    prompt.responses[0]?.engine
  );
  const [view, setView] = useState<PromptSheetView>("raw");
  const [brand, setBrand] = useState<StateOfAiSearchRankingRow | null>(null);
  const response =
    prompt.responses.find((item) => item.engine === engineId) ??
    prompt.responses[0];
  const engine = report.engines.find((item) => item.id === response?.engine);
  const canStack = depth < MAX_SHEET_DEPTH;

  return (
    <>
      <SheetHeader className="shrink-0 gap-3 border-b p-4">
        <div className="flex min-w-0 flex-col gap-1 pr-9">
          <SheetTitle className="text-base leading-6 font-medium text-balance">
            {prompt.prompt}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-1.5 text-xs">
            <span>{prompt.answers} answers</span>
            <span aria-hidden="true">·</span>
            <span>
              {prompt.consensus ? "Assistants agree" : "Assistants split"}
            </span>
            {prompt.topPick ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Named first:{" "}
                  <span className="text-foreground font-medium">
                    {prompt.topPick.name}
                  </span>
                </span>
              </>
            ) : null}
          </SheetDescription>
        </div>
        {engine && response ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <PromptEngineSwitcher
              active={engine.model}
              items={switcherItems(report, prompt.responses)}
              onChange={(model) => {
                setView("raw");
                setEngineId(
                  report.engines.find((item) => item.model === model)?.id ??
                    response.engine
                );
              }}
            />
            <PermissionRow
              className="w-fit shrink-0"
              label="View"
              layout="compact"
              onValueChange={(value) => {
                if (value === "raw" || value === "analysis") {
                  setView(value);
                }
              }}
              value={view}
            >
              <PermissionOption value="raw">Answer</PermissionOption>
              <PermissionOption value="analysis">Brands</PermissionOption>
            </PermissionRow>
          </div>
        ) : null}
      </SheetHeader>
      {view === "analysis" || !response || !engine ? (
        <PromptAnalysis
          onSelectBrand={canStack ? setBrand : undefined}
          prompt={prompt}
          report={report}
        />
      ) : (
        <AnswerBody
          engine={engine}
          prompt={prompt.prompt}
          response={response}
        />
      )}
      {canStack ? (
        <BrandSheet
          brand={brand}
          depth={depth + 1}
          onClose={() => setBrand(null)}
          report={report}
        />
      ) : null}
    </>
  );
}

/**
 * The app's prompt drawer for a report prompt. Brands opened from here stack
 * on top of it instead of replacing it.
 */
export function PromptSheet({
  report,
  prompt: promptProp,
  onClose,
  depth = 1,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow | null;
  onClose: () => void;
  depth?: number;
}) {
  const [prompt, releasePrompt] = useRetainedValue(promptProp);
  if (!prompt) {
    return null;
  }
  return (
    <Sheet
      onOpenChange={(open) => !open && onClose()}
      onOpenChangeComplete={releasePrompt}
      open={promptProp !== null}
    >
      <DetailSheetContent size="lg">
        <PromptSheetBody
          depth={depth}
          key={prompt.id}
          prompt={prompt}
          report={report}
        />
      </DetailSheetContent>
    </Sheet>
  );
}
