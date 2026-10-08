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
import { type ReactNode, useState } from "react";

import { GoogleAiOverview } from "@/components/state-of-ai-search/ai-overview-card";
import { BrandSheet } from "@/components/state-of-ai-search/brand-sheet";
import {
  ReportBlock,
  ReportPanel,
} from "@/components/state-of-ai-search/report-section";
import { Brand } from "@/components/state-of-ai-search/report-tables";
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

/** Frame with a title row on the shell, like the app's receipt sections. */
function OverviewSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <ReportPanel
      bodyClassName="overflow-hidden"
      header={
        <>
          <span className="text-foreground">{title}</span>
          {typeof count === "number" ? (
            <span className="ml-auto text-xs font-normal tabular-nums">
              {count}
            </span>
          ) : null}
        </>
      }
    >
      {children}
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
  prompt,
  response,
  onSelectBrand,
}: {
  report: StateOfAiSearchReport;
  prompt: StateOfAiSearchPromptRow;
  response: StateOfAiSearchPromptAnswer;
  onSelectBrand?: (brand: StateOfAiSearchRankingRow) => void;
}) {
  const brandRow = (name: string) =>
    report.ranking.find((row) => row.name === name);
  const firstBrand = response.mentioned[0];
  const stats = [
    { label: "Brands named", value: String(response.mentioned.length) },
    { label: "Named first", value: firstBrand ?? "–" },
    { label: "Sources", value: String(response.sources.length) },
  ];
  return (
    <SheetScrollArea className="bg-muted/20 flex min-h-full flex-col gap-4 p-4 sm:px-4">
      <ReportPanel bodyClassName="divide-border/60 grid grid-cols-3 divide-x">
        {stats.map((stat) => (
          <div
            className="flex min-w-0 flex-col gap-1 px-4 py-3"
            key={stat.label}
          >
            <span className="text-muted-foreground text-xs">{stat.label}</span>
            <span className="truncate text-base font-medium">{stat.value}</span>
          </div>
        ))}
      </ReportPanel>

      <OverviewSection
        count={response.mentioned.length}
        title="Brands in this answer"
      >
        {response.mentioned.length > 0 ? (
          <ol className="flex flex-wrap gap-1.5 p-3">
            {response.mentioned.map((name, index) => {
              const row = brandRow(name);
              return (
                <li key={name}>
                  <button
                    className="bg-muted/40 hover:bg-muted flex h-8 items-center gap-2 rounded-lg border pr-2.5 pl-1.5 text-sm transition-colors disabled:cursor-default"
                    disabled={!(row && onSelectBrand)}
                    onClick={() => row && onSelectBrand?.(row)}
                    type="button"
                  >
                    <span className="text-muted-foreground w-4 text-center text-xs tabular-nums">
                      {index + 1}
                    </span>
                    {row ? <Brand domain={row.domain} name={row.name} /> : name}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-muted-foreground px-4 py-3 text-sm">
            No tracked brand in this answer.
          </p>
        )}
      </OverviewSection>

      {response.highlights.length > 0 ? (
        <OverviewSection
          count={response.highlights.length}
          title="What it says about them"
        >
          <ul className="divide-border/60 divide-y">
            {response.highlights.map((highlight) => {
              const row = brandRow(highlight.brand);
              return (
                <li className="flex gap-3 px-4 py-3" key={highlight.brand}>
                  {row ? (
                    <CompetitorLogo
                      className="mt-0.5 size-5 shrink-0 rounded-md"
                      domain={row.domain}
                      name={row.name}
                    />
                  ) : null}
                  <p className="text-muted-foreground text-sm/6 text-pretty">
                    <HighlightText
                      brand={highlight.match}
                      text={highlight.text}
                    />
                  </p>
                </li>
              );
            })}
          </ul>
        </OverviewSection>
      ) : null}

      {response.searchQueries.length > 0 ? (
        <OverviewSection count={response.searchQueries.length} title="Searches">
          <ul className="flex flex-wrap gap-1.5 p-3">
            {response.searchQueries.map((query) => (
              <li
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
              </li>
            ))}
          </ul>
        </OverviewSection>
      ) : null}

      {response.sources.length > 0 ? (
        <OverviewSection count={response.sources.length} title="Sources">
          <ul className="divide-border/60 divide-y">
            {response.sources.map((source) => (
              <li key={source.url}>
                <a
                  className="hover:bg-muted/50 flex h-10 min-w-0 items-center gap-3 px-4 text-sm transition-colors"
                  href={source.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  <CompetitorLogo
                    className="size-4 shrink-0 rounded-sm"
                    domain={source.domain}
                    name={source.domain}
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={source.title ?? undefined}
                  >
                    {source.title ?? source.domain}
                  </span>
                  <span className="text-muted-foreground max-w-[40%] shrink-0 truncate text-xs">
                    {source.domain}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </OverviewSection>
      ) : null}

      <p className="text-muted-foreground px-1 text-xs">
        Across all {prompt.answers} answers to this prompt,{" "}
        {prompt.topPick?.name ?? "no brand"} was named first most often.
      </p>
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
            prompt={prompt}
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
