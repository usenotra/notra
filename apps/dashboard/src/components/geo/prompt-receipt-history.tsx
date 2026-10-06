"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_PROMPT_HISTORY_SKELETON_ROWS,
  GEO_PROMPT_HISTORY_PAGE_SIZE,
} from "@notra/geo-core/constants/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { PromptOutcomeIcon } from "@/components/geo/prompt-outcome-icon";
import { GEO_PROMPT_OUTCOME_LABEL_KEYS } from "@/constants/geo-prompts";
import { cn } from "@/lib/utils";
import type {
  PromptHistoryChange,
  PromptHistoryEntry,
  PromptReceiptHistoryProps,
} from "@/types/geo";
import { promptOutcomeKey } from "@/utils/geo-prompt-history";

function ChangeText({ change }: { change: PromptHistoryChange }) {
  const t = useTranslations("geo.promptReceiptHistory");
  const tGeoShared = useTranslations("geo.shared");
  const position = (value: number | null) =>
    value === null ? tGeoShared("notRanked") : `#${value}`;
  switch (change.kind) {
    case "gained":
      return (
        <span className="text-geo-up font-medium">
          {change.position === null
            ? t("gainedMention")
            : t("gainedLabel", { position: position(change.position) })}
        </span>
      );
    case "lost":
      return (
        <span className="text-geo-down font-medium">{t("lostMention")}</span>
      );
    case "position":
      return (
        <span className="text-foreground tabular-nums">
          {t("movedLabel", {
            from: position(change.from),
            to: position(change.to),
          })}
        </span>
      );
    case "none":
      return <span>{t("noChange")}</span>;
    case "first":
      return <span>{t("firstScan")}</span>;
    default:
      return null;
  }
}

function HistoryRow({
  entry,
  onSelect,
}: {
  entry: PromptHistoryEntry;
  onSelect?: PromptReceiptHistoryProps["onSelect"];
}) {
  const t = useTranslations("geo.promptReceiptHistory");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const { check } = entry;
  const timestamp = formatAiTrafficTimestamp(check.capturedAt, locale);
  const visible = check.mentioned || Boolean(check.ownedSourceCited);
  const content = (
    <>
      <PromptOutcomeIcon mentioned={visible} />
      <span className="sr-only">
        {tGeoShared(
          GEO_PROMPT_OUTCOME_LABEL_KEYS[
            promptOutcomeKey(check.mentioned, check.ownedSourceCited)
          ]
        )}
      </span>
      <time
        className="text-foreground w-32 shrink-0 tabular-nums"
        dateTime={check.capturedAt}
      >
        {timestamp}
      </time>
      <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-x-2 truncate">
        {entry.changes.map((change) => (
          <ChangeText change={change} key={change.kind} />
        ))}
        {entry.newCompetitors.length > 0 ? (
          <span
            className="min-w-0 truncate"
            title={entry.newCompetitors.join(", ")}
          >
            {t("newBrands", { names: entry.newCompetitors.join(", ") })}
          </span>
        ) : null}
      </span>
      {onSelect ? (
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground/60 group-hover:text-foreground size-3.5 shrink-0 transition-colors"
          icon={ArrowRight01Icon}
          strokeWidth={2}
        />
      ) : null}
    </>
  );
  const rowClass = "flex h-10 w-full min-w-0 items-center gap-3 px-4 text-sm";

  if (!onSelect) {
    return <div className={rowClass}>{content}</div>;
  }
  return (
    <button
      // The row's text (outcome, time, changes) is its accessible name.
      title={t("viewAnswer")}
      className={cn(
        rowClass,
        "group hover:bg-muted/50 focus-visible:ring-ring cursor-pointer text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      )}
      onClick={() => onSelect(check)}
      type="button"
    >
      {content}
    </button>
  );
}

/**
 * One line per scan: outcome, when, and what moved since the scan before.
 * Clicking a row opens the answer that scan captured. Rows render a page at a
 * time as the sheet scrolls; the history itself is already loaded.
 */
export function PromptReceiptHistory({
  entries,
  isLoading,
  onSelect,
}: PromptReceiptHistoryProps) {
  const t = useTranslations("geo.promptReceiptHistory");
  const [visibleCount, setVisibleCount] = useState(
    GEO_PROMPT_HISTORY_PAGE_SIZE
  );
  const sentinelRef = useRef<HTMLLIElement>(null);
  const hasMore = !isLoading && visibleCount < entries.length;

  // Re-observes after every page, so a sentinel that is still in view keeps
  // loading until the list fills past it.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!(hasMore && node)) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => count + GEO_PROMPT_HISTORY_PAGE_SIZE);
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  if (isLoading) {
    return (
      <ul className="divide-border/60 divide-y">
        {Array.from(
          { length: GEO_PROMPT_HISTORY_SKELETON_ROWS },
          (_, index) => (
            <li className="flex h-10 items-center gap-3 px-4" key={index}>
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
            </li>
          )
        )}
      </ul>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm">
        {t("noHistory")}
      </p>
    );
  }

  return (
    <ul className="divide-border/60 divide-y">
      {entries.slice(0, visibleCount).map((entry) => (
        <li key={entry.check.id}>
          <HistoryRow entry={entry} onSelect={onSelect} />
        </li>
      ))}
      {hasMore ? (
        <li
          aria-hidden="true"
          className="flex h-10 items-center gap-3 px-4"
          ref={sentinelRef}
        >
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-24" />
        </li>
      ) : null}
    </ul>
  );
}
