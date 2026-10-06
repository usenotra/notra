"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PROMPT_SOURCES_VISIBLE_ROWS } from "@notra/geo-core/constants/geo";
import type {
  GeoAnswerSource,
  GeoCompetitor,
  GeoPromptResult,
} from "@notra/geo-core/types/geo";
import { PerplexityFavicon } from "@notra/ui/components/ai-skins/perplexity/perplexity-favicon";
import { TABLE_BODY_CLASS, TABLE_FRAME_CLASS } from "@notra/ui/constants/table";
import { type ReactNode, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
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

function BrandChips({
  names,
  competitors,
}: {
  names: readonly string[];
  competitors: readonly GeoCompetitor[] | undefined;
}) {
  const tCommon = useTranslations("common");
  if (names.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm">
        {tCommon("states.none")}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5 p-3">
      {names.map((name) => (
        <li
          className="bg-muted/40 flex h-8 max-w-full min-w-0 items-center gap-2 rounded-lg border pr-2.5 pl-1.5 text-sm"
          key={name}
        >
          <CompetitorLogo
            className="size-5 rounded-md"
            competitors={competitors}
            name={name}
          />
          <span className="min-w-0 truncate" title={name}>
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
  const stats = [
    {
      key: "visibility",
      label: tCommon("labels.visibility"),
      value: tGeoShared(
        GEO_PROMPT_OUTCOME_LABEL_KEYS[
          promptOutcomeKey(result.mentioned, result.ownedSourceCited)
        ]
      ),
      className: "text-foreground",
    },
    {
      key: "position",
      label: tCommon("labels.position"),
      value:
        result.position === null
          ? tGeoShared("notRanked")
          : `#${result.position}`,
      className: "text-foreground tabular-nums",
    },
    {
      key: "sentiment",
      label: tCommon("labels.sentiment"),
      value: sentimentLabel,
      className: sentimentToneClass(result.sentiment),
    },
  ];

  return (
    <section
      aria-label={tGeoShared("outcome")}
      className={cn(TABLE_FRAME_CLASS, "min-w-0")}
    >
      <dl
        className={cn(
          TABLE_BODY_CLASS,
          "divide-border/60 grid grid-cols-3 divide-x"
        )}
      >
        {stats.map((stat) => (
          <div className="flex min-w-0 flex-col gap-1 px-4 py-3" key={stat.key}>
            <dt className="text-muted-foreground text-xs">{stat.label}</dt>
            <dd
              className={cn("truncate text-base font-medium", stat.className)}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SearchQueries({ queries }: { queries: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5 p-3">
      {queries.map((query) => (
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
          <span className="text-foreground min-w-0 truncate" title={query}>
            {query}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SourcesList({ sources }: { sources: readonly GeoAnswerSource[] }) {
  const t = useTranslations("geo.promptReceiptAnalysis");
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? sources
    : sources.slice(0, GEO_PROMPT_SOURCES_VISIBLE_ROWS);
  const hiddenCount = sources.length - visible.length;

  return (
    <>
      <ul className="divide-border/60 divide-y">
        {visible.map((source) => {
          const href = getSafeReferenceSourceUrl(source.url);
          const rowClass = "flex h-10 min-w-0 items-center gap-3 px-4 text-sm";
          const content = (
            <>
              <PerplexityFavicon
                className="size-4 shrink-0"
                domain={source.domain}
              />
              <span className="min-w-0 flex-1 truncate" title={source.title}>
                {source.title}
              </span>
              <span className="text-muted-foreground max-w-[40%] shrink-0 truncate text-xs">
                {source.domain}
              </span>
            </>
          );

          return (
            <li key={source.url}>
              {href ? (
                <a
                  className={cn(
                    rowClass,
                    "hover:bg-muted/50 focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  )}
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <span className={rowClass}>{content}</span>
              )}
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <div className="border-border/60 border-t px-2 py-1.5">
          <Button
            className="w-full"
            onClick={() => setExpanded(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("showAllSources", { count: sources.length })}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export function ReceiptSection({
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
      <div className="flex items-center justify-between gap-3 px-3.5 py-2">
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
          <BrandChips competitors={competitors} names={competitorNames} />
        </ReceiptSection>
        {result.sources.length > 0 ? (
          <ReceiptSection count={result.sources.length} title={t("sources")}>
            <SourcesList sources={result.sources} />
          </ReceiptSection>
        ) : null}
        {result.searchQueries.length > 0 ? (
          <ReceiptSection
            count={result.searchQueries.length}
            title={t("searches")}
          >
            <SearchQueries queries={result.searchQueries} />
          </ReceiptSection>
        ) : null}
        {showHistory ? (
          <ReceiptSection
            count={isHistoryLoading ? null : entries.length}
            title={t("history")}
          >
            <PromptReceiptHistory
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
