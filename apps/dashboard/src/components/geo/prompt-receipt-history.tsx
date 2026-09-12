"use client";

import {
  GEO_PROMPT_HISTORY_ANSWER_LABELS,
  GEO_PROMPT_HISTORY_CHANGE_LABELS,
  GEO_PROMPT_HISTORY_COLUMN_LABELS,
  GEO_PROMPT_HISTORY_EMPTY_COMPETITORS,
  GEO_PROMPT_HISTORY_EMPTY_POSITION,
  GEO_PROMPT_HISTORY_NEW_COMPETITORS_VISIBLE,
  GEO_PROMPT_HISTORY_PREVIEW_ROWS,
  GEO_PROMPT_HISTORY_SKELETON_ROWS,
  GEO_PROMPT_RECEIPT_LABELS,
} from "@notra/geo-core/constants/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { type ReactNode, useState } from "react";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { PromptOutcomeIcon } from "@/components/geo/prompt-outcome-icon";
import { Table } from "@/components/motion/table";
import { TABLE_MAX_HEIGHT, TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  PromptHistoryBrandTokenProps,
  PromptHistoryChange,
  PromptHistoryEntry,
  PromptHistoryNewCompetitorsCellProps,
  PromptReceiptHistoryProps,
} from "@/types/geo";
import {
  promptHistoryChangeLabel,
  promptOutcomeLabel,
} from "@/utils/geo-prompt-history";
import { pageRowCount, tableHeightFor } from "@/utils/table";

/** Shared first-line box so icons, chips, and text sit on one baseline. */
const HISTORY_LINE_CLASS = "flex min-h-6 items-center";

function positionLabel(position: number | null): string {
  return position === null ? GEO_PROMPT_HISTORY_EMPTY_POSITION : `#${position}`;
}

function PositionChip({
  position,
  tone = "neutral",
}: {
  position: number | null;
  tone?: "neutral" | "up";
}) {
  if (position === null) {
    return (
      <span className="text-muted-foreground/70">
        {GEO_PROMPT_RECEIPT_LABELS.notRanked}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-1 text-xs font-medium tabular-nums",
        tone === "up" ? "bg-geo-up/10 text-geo-up" : "bg-muted text-foreground"
      )}
    >
      {positionLabel(position)}
    </span>
  );
}

function BrandToken({ name, competitors }: PromptHistoryBrandTokenProps) {
  return (
    <span
      className={cn(
        HISTORY_LINE_CLASS,
        "max-w-full shrink-0 gap-1.5 font-medium"
      )}
    >
      <CompetitorLogo
        className="size-4 shrink-0 rounded-[4px]"
        competitors={competitors}
        name={name}
      />
      <span className="min-w-0 truncate" title={name}>
        {name}
      </span>
    </span>
  );
}

function ChangeWords({ change }: { change: PromptHistoryChange }) {
  switch (change.kind) {
    case "gained":
      return (
        <>
          <span className="text-geo-up font-medium">
            {GEO_PROMPT_HISTORY_CHANGE_LABELS.gainedMention}
          </span>
          {change.position === null ? null : (
            <>
              <span>{GEO_PROMPT_HISTORY_CHANGE_LABELS.gainedMentionAt}</span>
              <PositionChip position={change.position} tone="up" />
            </>
          )}
        </>
      );
    case "lost":
      return (
        <span className="text-geo-down font-medium">
          {GEO_PROMPT_HISTORY_CHANGE_LABELS.lostMention}
        </span>
      );
    case "position":
      return (
        <>
          <span>{GEO_PROMPT_HISTORY_CHANGE_LABELS.moved}</span>
          <PositionChip position={change.from} />
          <span>→</span>
          <PositionChip position={change.to} />
        </>
      );
    default:
      return (
        <span className="text-muted-foreground/70">
          {promptHistoryChangeLabel(change)}
        </span>
      );
  }
}

function ChangesCell({ entry }: { entry: PromptHistoryEntry }) {
  return (
    <ul className="flex flex-col gap-1">
      {entry.changes.map((change) => (
        <li
          className={cn(
            HISTORY_LINE_CLASS,
            "text-muted-foreground min-w-0 flex-wrap gap-x-1 gap-y-1"
          )}
          key={`${entry.check.id}-${change.kind}`}
        >
          <span className="sr-only">{promptHistoryChangeLabel(change)}</span>
          <span aria-hidden="true" className="contents">
            <ChangeWords change={change} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function MoreCompetitors({
  names,
  competitors,
}: PromptHistoryNewCompetitorsCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`${names.length} more: ${names.join(", ")}`}
        render={
          <span
            className={cn(
              HISTORY_LINE_CLASS,
              "text-muted-foreground cursor-default tabular-nums"
            )}
          />
        }
      >
        +{names.length}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <ul className="flex flex-col gap-1.5">
          {names.map((name) => (
            <li key={name}>
              <BrandToken competitors={competitors} name={name} />
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function NewCompetitorsCell({
  names,
  competitors,
}: PromptHistoryNewCompetitorsCellProps) {
  if (names.length === 0) {
    return (
      <span className={cn(HISTORY_LINE_CLASS, "text-muted-foreground/60")}>
        {GEO_PROMPT_HISTORY_EMPTY_COMPETITORS}
      </span>
    );
  }

  const visible = names.slice(0, GEO_PROMPT_HISTORY_NEW_COMPETITORS_VISIBLE);
  const hidden = names.slice(GEO_PROMPT_HISTORY_NEW_COMPETITORS_VISIBLE);

  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      {visible.map((name) => (
        <li className="max-w-full" key={name}>
          <BrandToken competitors={competitors} name={name} />
        </li>
      ))}
      {hidden.length > 0 ? (
        <li>
          <MoreCompetitors competitors={competitors} names={hidden} />
        </li>
      ) : null}
    </ul>
  );
}

const HISTORY_PAGE_SIZE = GEO_PROMPT_HISTORY_PREVIEW_ROWS;

export function PromptReceiptHistory({
  entries,
  isLoading,
  competitors,
  onSelect,
}: PromptReceiptHistoryProps) {
  const [requestedPage, setPage] = useState(1);

  const totalItems = entries.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / HISTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const visible = isLoading
    ? []
    : entries.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
  const paginated = totalItems > HISTORY_PAGE_SIZE;
  let footer: ReactNode;
  if (!isLoading && paginated) {
    footer = (
      <TablePagination
        page={page}
        pageCount={pageCount}
        pageRowCount={pageRowCount(page, HISTORY_PAGE_SIZE, totalItems)}
        pageSize={HISTORY_PAGE_SIZE}
        setPage={setPage}
        showPageNumbers={false}
        totalItems={totalItems}
      />
    );
  } else if (!isLoading && entries.length === 1) {
    footer = (
      <p className="text-muted-foreground px-4 py-3 text-xs">
        {GEO_PROMPT_RECEIPT_LABELS.singleScan}
      </p>
    );
  }

  return (
    <Table
      columns={[
        {
          key: "scan",
          header: GEO_PROMPT_HISTORY_COLUMN_LABELS.date,
          width: "144px",
          cell: ({ check }) => {
            const timestamp = formatAiTrafficTimestamp(check.capturedAt);
            const date = (
              <time
                className="tabular-nums"
                dateTime={check.capturedAt}
                title={check.scanId}
              >
                {timestamp}
              </time>
            );

            return onSelect ? (
              <button
                aria-label={`${GEO_PROMPT_HISTORY_ANSWER_LABELS.viewAnswer} · ${timestamp}`}
                className={cn(
                  HISTORY_LINE_CLASS,
                  "focus-visible:ring-ring cursor-pointer rounded-sm text-left underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(check);
                }}
                title={GEO_PROMPT_HISTORY_ANSWER_LABELS.viewAnswer}
                type="button"
              >
                {date}
              </button>
            ) : (
              <span className={HISTORY_LINE_CLASS}>{date}</span>
            );
          },
        },
        {
          key: "outcome",
          header: GEO_PROMPT_HISTORY_COLUMN_LABELS.outcome,
          width: "168px",
          minWidth: "168px",
          cell: ({ check }) => (
            <span className={cn(HISTORY_LINE_CLASS, "gap-2 whitespace-nowrap")}>
              <PromptOutcomeIcon
                mentioned={check.mentioned || Boolean(check.ownedSourceCited)}
              />
              <span
                className={
                  check.mentioned || check.ownedSourceCited
                    ? "text-foreground"
                    : "text-muted-foreground"
                }
              >
                {promptOutcomeLabel(check.mentioned, check.ownedSourceCited)}
              </span>
            </span>
          ),
        },
        {
          key: "position",
          header: GEO_PROMPT_HISTORY_COLUMN_LABELS.position,
          width: "80px",
          cell: ({ check }) => (
            <span className={HISTORY_LINE_CLASS}>
              <PositionChip position={check.position} />
            </span>
          ),
        },
        {
          key: "changes",
          header: GEO_PROMPT_HISTORY_COLUMN_LABELS.changes,
          width: "192px",
          cell: (entry) => <ChangesCell entry={entry} />,
        },
        {
          key: "newCompetitors",
          header: GEO_PROMPT_HISTORY_COLUMN_LABELS.newCompetitors,
          width: "1fr",
          minWidth: "176px",
          cell: (entry) => (
            <NewCompetitorsCell
              competitors={competitors}
              names={entry.newCompetitors}
            />
          ),
        },
      ]}
      data={visible}
      emptyState={GEO_PROMPT_RECEIPT_LABELS.noHistory}
      footer={footer}
      getRowId={(entry) => entry.check.id}
      height={
        isLoading || entries.length === 0
          ? tableHeightFor(isLoading ? GEO_PROMPT_HISTORY_SKELETON_ROWS : 0)
          : TABLE_MAX_HEIGHT
      }
      loading={isLoading}
      rowHeight={TABLE_ROW_HEIGHT}
      rowSizing="content"
      skeletonRows={GEO_PROMPT_HISTORY_SKELETON_ROWS}
    />
  );
}
