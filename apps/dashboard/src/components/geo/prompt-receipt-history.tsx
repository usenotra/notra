"use client";

import {
  GEO_PROMPT_HISTORY_ANSWER_LABELS,
  GEO_PROMPT_HISTORY_SKELETON_ROWS,
  GEO_PROMPT_RECEIPT_LABELS,
} from "@notra/geo-core/constants/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import type {
  PromptHistoryEntry,
  PromptReceiptHistoryProps,
} from "@/types/geo";
import {
  promptHistoryChangeText,
  promptOutcomeLabel,
  promptPositionLabel,
} from "@/utils/geo-prompt-history";

function HistoryRow({
  entry,
  onSelect,
}: {
  entry: PromptHistoryEntry;
  onSelect?: PromptReceiptHistoryProps["onSelect"];
}) {
  const { check } = entry;
  const timestamp = formatAiTrafficTimestamp(check.capturedAt);
  const outcome = promptOutcomeLabel(check.mentioned, check.ownedSourceCited);
  const position = promptPositionLabel(check.position);
  const body = (
    <>
      <span className="text-sm">
        <time dateTime={check.capturedAt} title={check.scanId}>
          {timestamp}
        </time>
        {` · ${outcome} · ${position}`}
      </span>
      <span className="text-muted-foreground text-xs">
        {promptHistoryChangeText(entry)}
      </span>
    </>
  );

  if (!onSelect) {
    return <li className="flex flex-col gap-1 px-4 py-2.5">{body}</li>;
  }

  return (
    <li>
      <button
        aria-label={`${GEO_PROMPT_HISTORY_ANSWER_LABELS.viewAnswer} · ${timestamp}`}
        className="hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full flex-col gap-1 px-4 py-2.5 text-left outline-none focus-visible:ring-2"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(check);
        }}
        type="button"
      >
        {body}
      </button>
    </li>
  );
}

export function PromptReceiptHistory({
  entries,
  isLoading,
  onSelect,
}: PromptReceiptHistoryProps) {
  if (isLoading) {
    return (
      <ul aria-hidden="true" className="divide-border/60 divide-y border-t">
        {Array.from(
          { length: GEO_PROMPT_HISTORY_SKELETON_ROWS },
          (_, index) => (
            <li className="flex flex-col gap-1.5 px-4 py-2.5" key={index}>
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </li>
          )
        )}
      </ul>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground border-t px-4 py-5 text-center text-sm">
        {GEO_PROMPT_RECEIPT_LABELS.noHistory}
      </p>
    );
  }

  return (
    <>
      <ul className="divide-border/60 divide-y border-t">
        {entries.map((entry) => (
          <HistoryRow entry={entry} key={entry.check.id} onSelect={onSelect} />
        ))}
      </ul>
      {entries.length === 1 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">
          {GEO_PROMPT_RECEIPT_LABELS.singleScan}
        </p>
      ) : null}
    </>
  );
}
