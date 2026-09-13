"use client";

import { GEO_PROMPT_RECEIPT_LABELS } from "@notra/geo-core/constants/geo";
import type {
  GeoAnswerSource,
  GeoCompetitor,
  GeoPromptResult,
} from "@notra/geo-core/types/geo";
import type { ReactNode } from "react";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { PromptReceiptHistory } from "@/components/geo/prompt-receipt-history";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { PromptReceiptAnalysisProps } from "@/types/geo";
import {
  promptHistoryChanges,
  promptOutcomeLabel,
  promptPositionLabel,
  promptSentimentLabel,
} from "@/utils/geo-prompt-history";
import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";
import { tableHeightFor } from "@/utils/table";

function sentimentToneClass(sentiment: string | null): string {
  if (sentiment === "positive") {
    return "text-geo-up";
  }
  if (sentiment === "negative") {
    return "text-geo-down";
  }
  return "text-foreground";
}

function OutcomeCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="flex min-h-6 items-center text-base font-medium">
        {children}
      </span>
    </div>
  );
}

function OutcomeValue({
  mentioned,
  ownedSourceCited,
}: {
  mentioned: boolean;
  ownedSourceCited?: boolean;
}) {
  const visible = mentioned || Boolean(ownedSourceCited);
  return (
    <span className={visible ? "text-foreground" : "text-muted-foreground"}>
      {promptOutcomeLabel(mentioned, ownedSourceCited)}
    </span>
  );
}

function CompetitorsCell({
  names,
  competitors,
}: {
  names: readonly string[];
  competitors: readonly GeoCompetitor[] | undefined;
}) {
  return (
    <Table
      columns={[
        {
          key: "name",
          header: "Brand",
          cell: ({ name }) => (
            <span className="flex min-w-0 items-center gap-3 text-sm">
              <CompetitorLogo
                className="size-6 rounded-md border"
                competitors={competitors}
                name={name}
              />
              <span className="min-w-0 truncate" title={name}>
                {name}
              </span>
            </span>
          ),
        },
      ]}
      data={names.map((name) => ({ name }))}
      emptyState={GEO_PROMPT_RECEIPT_LABELS.noCompetitors}
      getRowId={({ name }) => name}
      height={tableHeightFor(names.length)}
    />
  );
}

function OutcomeStrip({ result }: { result: GeoPromptResult }) {
  return (
    <section
      aria-label="Outcome"
      className="bg-background grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border p-4 sm:grid-cols-3"
    >
      <OutcomeCell label="Outcome">
        <OutcomeValue
          mentioned={result.mentioned}
          ownedSourceCited={result.ownedSourceCited}
        />
      </OutcomeCell>
      <OutcomeCell label={GEO_PROMPT_RECEIPT_LABELS.position}>
        <span className="tabular-nums">
          {promptPositionLabel(result.position)}
        </span>
      </OutcomeCell>
      <OutcomeCell label={GEO_PROMPT_RECEIPT_LABELS.sentiment}>
        <span className={sentimentToneClass(result.sentiment)}>
          {promptSentimentLabel(result.sentiment)}
        </span>
      </OutcomeCell>
    </section>
  );
}

function SearchQueries({ queries }: { queries: readonly string[] }) {
  return (
    <Table
      columns={[
        {
          key: "query",
          header: "Search query",
          cell: ({ query }) => (
            <span className="block truncate" title={query}>
              {query}
            </span>
          ),
        },
      ]}
      data={queries.map((query) => ({ query }))}
      getRowId={({ query }) => query}
      height={tableHeightFor(queries.length)}
    />
  );
}

const sourceColumns: TableColumn<GeoAnswerSource>[] = [
  {
    key: "title",
    header: "Source",
    width: "1fr",
    minWidth: "12rem",
    cell: (source) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{source.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {source.domain}
        </span>
      </span>
    ),
  },
  {
    key: "url",
    header: "URL",
    width: "1fr",
    minWidth: "12rem",
    cell: (source) => {
      const href = getSafeReferenceSourceUrl(source.url);
      return href ? (
        <a
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 block truncate rounded-sm text-xs underline-offset-2 outline-none hover:underline focus-visible:ring-2"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {source.url}
        </a>
      ) : (
        <span className="text-muted-foreground block truncate text-xs">
          {source.url}
        </span>
      );
    },
  },
];

function SourcesTable({ sources }: { sources: readonly GeoAnswerSource[] }) {
  return (
    <Table
      columns={sourceColumns}
      data={Array.from(sources)}
      getRowId={(source) => source.url}
      height={tableHeightFor(sources.length)}
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}

function ReceiptSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number | null;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="flex items-baseline gap-2 text-sm font-medium">
        {title}
        {typeof count === "number" ? (
          <span className="text-muted-foreground text-xs font-normal tabular-nums">
            {count.toLocaleString()}
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

export function PromptReceiptAnalysis({
  prompt,
  result,
  history,
  isHistoryLoading,
  competitors,
  onSelectCheck,
  showHistory = true,
  scrollable = true,
}: PromptReceiptAnalysisProps) {
  const entries = promptHistoryChanges(history);
  const competitorNames = [...new Set(result.competitors)];

  return (
    <div
      className={
        scrollable
          ? "bg-muted/20 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          : "bg-muted/20"
      }
    >
      <div className="flex w-full flex-col gap-4 p-4">
        <OutcomeStrip result={result} />
        <ReceiptSection title={GEO_PROMPT_RECEIPT_LABELS.competitors}>
          <CompetitorsCell competitors={competitors} names={competitorNames} />
        </ReceiptSection>
        {result.searchQueries.length > 0 ? (
          <ReceiptSection title={GEO_PROMPT_RECEIPT_LABELS.searches}>
            <SearchQueries queries={result.searchQueries} />
          </ReceiptSection>
        ) : null}
        {result.sources.length > 0 ? (
          <ReceiptSection title={GEO_PROMPT_RECEIPT_LABELS.sources}>
            <SourcesTable sources={result.sources} />
          </ReceiptSection>
        ) : null}
        {showHistory ? (
          <ReceiptSection title={GEO_PROMPT_RECEIPT_LABELS.history}>
            <PromptReceiptHistory
              competitors={competitors}
              entries={entries}
              isLoading={isHistoryLoading}
              key={entries[0]?.check.id ?? "empty"}
              onSelect={onSelectCheck}
            />
          </ReceiptSection>
        ) : null}
      </div>
    </div>
  );
}
