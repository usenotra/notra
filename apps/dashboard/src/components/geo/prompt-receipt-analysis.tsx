"use client";

import type {
  GeoAnswerSource,
  GeoCompetitor,
  GeoPromptResult,
} from "@notra/geo-core/types/geo";
import { TABLE_BODY_CLASS, TABLE_FRAME_CLASS } from "@notra/ui/constants/table";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptReceiptHistory } from "@/components/geo/prompt-receipt-history";
import { GEO_PROMPT_OUTCOME_LABEL_KEYS } from "@/constants/geo-prompts";
import { cn } from "@/lib/utils";
import type { PromptReceiptAnalysisProps } from "@/types/geo";
import { uniquePromptBrandNames } from "@/utils/geo-prompt-brands";
import {
  promptHistoryChanges,
  promptOutcomeKey,
  promptSentimentKey,
} from "@/utils/geo-prompt-history";
import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";

function sentimentToneClass(sentiment: string | null): string {
  if (sentiment === "positive") {
    return "text-geo-up";
  }
  if (sentiment === "negative") {
    return "text-geo-down";
  }
  return "text-foreground";
}

function CompetitorsCell({
  names,
  competitors,
}: {
  names: readonly string[];
  competitors: readonly GeoCompetitor[] | undefined;
}) {
  const tCommon2 = useTranslations("common");
  if (names.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-5 text-center text-sm">
        {tCommon2("states.none")}
      </p>
    );
  }

  return (
    <ul className="divide-border/60 divide-y">
      {names.map((name) => (
        <li className="flex min-w-0 items-center gap-3 px-4 py-2.5" key={name}>
          {name === "ChatGPT" || name === "Gemini" ? (
            <EngineIcon
              className="size-4 shrink-0"
              engine={name === "ChatGPT" ? "openai" : "gemini"}
            />
          ) : (
            <CompetitorLogo
              className="size-6 rounded-md border"
              competitors={competitors}
              name={name}
            />
          )}
          <span className="min-w-0 truncate text-sm" title={name}>
            {name}
          </span>
        </li>
      ))}
    </ul>
  );
}

function OutcomeStrip({ result }: { result: GeoPromptResult }) {
  const t = useTranslations("geo.promptReceiptAnalysis");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const sentimentKey = promptSentimentKey(result.sentiment);
  let sentimentLabel = t("noSentiment");
  if (sentimentKey) {
    sentimentLabel = tCommon(`labels.${sentimentKey}`);
  } else if (result.sentiment) {
    sentimentLabel = result.sentiment;
  }
  return (
    <section
      aria-label={tGeoShared("outcome")}
      className="bg-background flex min-h-24 flex-wrap items-center justify-between gap-5 rounded-xl border p-5 shadow-xs"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {tCommon("labels.visibility")}
        </span>
        <span className="text-xl font-semibold tracking-tight">
          {tGeoShared(
            GEO_PROMPT_OUTCOME_LABEL_KEYS[
              promptOutcomeKey(result.mentioned, result.ownedSourceCited)
            ]
          )}
        </span>
      </div>
      <dl className="flex items-center gap-6 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">
            {tCommon("labels.position")}
          </dt>
          <dd className="font-medium tabular-nums">
            {result.position === null
              ? tGeoShared("notRanked")
              : `#${result.position}`}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">
            {tCommon("labels.sentiment")}
          </dt>
          <dd className={`font-medium ${sentimentToneClass(result.sentiment)}`}>
            {sentimentLabel}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function SearchQueries({ queries }: { queries: readonly string[] }) {
  return (
    <ul className="divide-border/60 divide-y">
      {queries.map((query) => (
        <li className="truncate px-4 py-2.5 text-sm" key={query} title={query}>
          {query}
        </li>
      ))}
    </ul>
  );
}

function SourcesList({ sources }: { sources: readonly GeoAnswerSource[] }) {
  return (
    <ul className="divide-border/60 divide-y">
      {sources.map((source) => {
        const href = getSafeReferenceSourceUrl(source.url);
        const content = (
          <>
            <span className="truncate text-sm">{source.title}</span>
            <span className="text-muted-foreground truncate text-xs">
              {source.domain}
            </span>
          </>
        );

        return (
          <li className="min-w-0 px-4 py-2.5" key={source.url}>
            {href ? (
              <a
                className="hover:text-foreground focus-visible:ring-ring/50 flex min-w-0 flex-col rounded-sm outline-none focus-visible:ring-2"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {content}
              </a>
            ) : (
              <span className="flex min-w-0 flex-col">{content}</span>
            )}
          </li>
        );
      })}
    </ul>
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
  const locale = useLocale();
  return (
    <section className={cn(TABLE_FRAME_CLASS, "min-w-0")}>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {typeof count === "number" ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {count.toLocaleString(locale)}
          </span>
        ) : null}
      </div>
      <div className={cn(TABLE_BODY_CLASS, "overflow-hidden")}>{children}</div>
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
  const t = useTranslations("geo.promptReceiptAnalysis");
  const entries = promptHistoryChanges(history);
  const competitorNames = uniquePromptBrandNames(result.competitors);

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
        <ReceiptSection count={competitorNames.length} title={t("competitors")}>
          <CompetitorsCell competitors={competitors} names={competitorNames} />
        </ReceiptSection>
        {result.searchQueries.length > 0 ? (
          <ReceiptSection
            count={result.searchQueries.length}
            title={t("searches")}
          >
            <SearchQueries queries={result.searchQueries} />
          </ReceiptSection>
        ) : null}
        {result.sources.length > 0 ? (
          <ReceiptSection count={result.sources.length} title={t("sources")}>
            <SourcesList sources={result.sources} />
          </ReceiptSection>
        ) : null}
        {showHistory ? (
          <PromptReceiptHistory
            competitors={competitors}
            entries={entries}
            isLoading={isHistoryLoading}
            key={entries[0]?.check.id ?? "empty"}
            onSelect={onSelectCheck}
            title={t("history")}
          />
        ) : null}
      </div>
    </div>
  );
}
