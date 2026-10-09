"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { useRetainedValue } from "@notra/ui/hooks/use-retained-value";
import { useState } from "react";

import { GoogleAiOverview } from "@/components/state-of-ai-search/ai-overview-card";
import { BrandSheet } from "@/components/state-of-ai-search/brand-sheet";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import {
  Brand,
  MutedText,
  ReportList,
  StatStrip,
} from "@/components/state-of-ai-search/report-ui";
import {
  MAX_SHEET_DEPTH,
  REPORT_SURFACE_LIFT,
} from "@/constants/state-of-ai-search";
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

/** Engine tabs switch fast here; the dashboard keeps its default spring. */
const ENGINE_PILL_TRANSITION = {
  type: "spring",
  bounce: 0,
  duration: 0.16,
} as const;

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

/**
 * One engine's answer in its skin: ChatGPT and Claude in the chat thread,
 * Google's overview in the AI Overview skin.
 */
function AnswerBody({
  prompt,
  response,
  engine,
}: {
  prompt: string;
  response: StateOfAiSearchPromptAnswer;
  engine: StateOfAiSearchEngine;
}) {
  if (response.engine === "ai-overview") {
    return (
      <div className="bg-aio-bg min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {response.overview ? (
          <GoogleAiOverview
            className="mx-auto max-w-3xl px-6 py-8"
            overview={response.overview}
          />
        ) : (
          <p className="text-aio-muted font-aio p-6 text-sm">
            Google showed no AI Overview for this search.
          </p>
        )}
      </div>
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
      bodyClassName="flex h-[min(40rem,70vh)] flex-none flex-col overflow-hidden"
      header={
        <PromptEngineSwitcher
          active={engine.model}
          compactOnMobile
          items={switcherItems(report, prompt.responses)}
          transition={ENGINE_PILL_TRANSITION}
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The highlight sentence with the brand name marked. */
function HighlightText({ text, brand }: { text: string; brand: string }) {
  // `brand` is the name or alias as the answer wrote it.
  const parts = text.split(new RegExp(`(${escapeRegex(brand)})`, "i"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === brand.toLowerCase() ? (
          <mark
            className="bg-primary/15 text-foreground rounded-sm px-0.5 font-medium"
            // biome-ignore lint/suspicious/noArrayIndexKey: split parts have no identity
            key={index}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * One assistant's answer at a glance: who it named and in which order, the
 * line it used for each brand, what it searched for and what it read.
 */
function PromptOverview({
  report,
  response,
  onSelectBrand,
}: {
  report: StateOfAiSearchReport;
  response: StateOfAiSearchPromptAnswer;
  onSelectBrand?: (brand: StateOfAiSearchRankingRow) => void;
}) {
  const brands = response.mentioned.flatMap((name, index) => {
    const row = report.ranking.find((item) => item.name === name);
    const highlight = response.highlights.find((item) => item.brand === name);
    return row ? [{ position: index + 1, row, highlight }] : [];
  });
  return (
    <SheetScrollArea className="flex flex-col gap-8">
      <StatStrip
        stats={[
          { label: "Brands named", value: response.mentioned.length },
          { label: "Named first", value: response.mentioned[0] ?? "–" },
          { label: "Sources", value: response.sources.length },
        ]}
      />

      <ReportBlock
        description="Every tracked brand in the order the answer names it, and the line it uses for each."
        title="Brands in this answer"
      >
        {brands.length > 0 ? (
          <ReportList
            columns={[
              {
                key: "position",
                header: "#",
                cell: (entry) => <MutedText>{entry.position}</MutedText>,
              },
              {
                key: "brand",
                header: "Brand",
                cell: (entry) => (
                  <Brand domain={entry.row.domain} name={entry.row.name} />
                ),
              },
              {
                key: "says",
                header: "What it says",
                grow: true,
                cell: (entry) =>
                  entry.highlight ? (
                    <span className="text-muted-foreground">
                      <HighlightText
                        brand={entry.highlight.match}
                        text={entry.highlight.text}
                      />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  ),
              },
            ]}
            getKey={(entry) => entry.row.name}
            onSelect={
              onSelectBrand ? (entry) => onSelectBrand(entry.row) : undefined
            }
            rows={brands}
          />
        ) : (
          <ReportPanel bodyClassName="text-muted-foreground px-4 py-3 text-sm">
            No tracked brand in this answer.
          </ReportPanel>
        )}
      </ReportBlock>

      {response.searchQueries.length > 0 ? (
        <ReportBlock
          description="What the assistant typed into its web search before answering."
          title="Searches"
        >
          <ReportPanel bodyClassName="flex flex-wrap gap-1.5 p-3">
            {response.searchQueries.map((query) => (
              <span
                className="bg-muted/40 text-muted-foreground flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 text-xs"
                key={query}
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-3 shrink-0"
                  icon={SearchIcon}
                  strokeWidth={2}
                />
                <span
                  className="text-foreground min-w-0 truncate"
                  title={query}
                >
                  {query}
                </span>
              </span>
            ))}
          </ReportPanel>
        </ReportBlock>
      ) : null}

      {response.sources.length > 0 ? (
        <ReportBlock
          description="The pages this answer linked, in order."
          title="Sources"
        >
          <ReportList
            columns={[
              {
                key: "page",
                header: "Page",
                grow: true,
                cell: (source) => (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CompetitorLogo
                      className="size-5 shrink-0 rounded-sm"
                      domain={source.domain}
                      name={source.domain}
                    />
                    <span className="min-w-0">
                      {source.title ?? source.domain}
                    </span>
                  </span>
                ),
              },
              {
                key: "domain",
                header: "Domain",
                align: "right",
                cell: (source) => <MutedText>{source.domain}</MutedText>,
              },
            ]}
            getHref={(source) => source.url}
            getKey={(source) => source.url}
            rows={response.sources}
          />
        </ReportBlock>
      ) : null}
    </SheetScrollArea>
  );
}

function PromptSheetBody({
  report,
  prompt,
  depth,
  initialEngine,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow;
  depth: number;
  initialEngine?: StateOfAiSearchEngineId;
}) {
  const [engineId, setEngineId] = useState<StateOfAiSearchEngineId | undefined>(
    initialEngine ?? prompt.responses[0]?.engine
  );
  const [view, setView] = useState<PromptSheetView>("analysis");
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
              compactOnMobile
              items={switcherItems(report, prompt.responses)}
              transition={ENGINE_PILL_TRANSITION}
              onChange={(model) => {
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
              <PermissionOption value="analysis">Overview</PermissionOption>
              <PermissionOption value="raw">Answer</PermissionOption>
            </PermissionRow>
          </div>
        ) : null}
      </SheetHeader>
      {response && engine ? (
        view === "analysis" ? (
          <PromptOverview
            onSelectBrand={canStack ? setBrand : undefined}
            report={report}
            response={response}
          />
        ) : (
          <AnswerBody
            engine={engine}
            prompt={prompt.prompt}
            response={response}
          />
        )
      ) : null}
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
  initialEngine,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow | null;
  onClose: () => void;
  depth?: number;
  /** Assistant tab to open on, e.g. the one that cited the source. */
  initialEngine?: StateOfAiSearchEngineId;
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
      <DetailSheetContent className={REPORT_SURFACE_LIFT} size="lg">
        <PromptSheetBody
          depth={depth}
          initialEngine={initialEngine}
          key={prompt.id}
          prompt={prompt}
          report={report}
        />
      </DetailSheetContent>
    </Sheet>
  );
}
