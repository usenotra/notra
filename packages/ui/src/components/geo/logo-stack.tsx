"use client";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { GEO_GAPS_LOGO_STACK_LIMIT } from "@notra/ui/constants/geo";
import type { LogoStackItem, LogoStackProps } from "@notra/ui/types/geo";

function LogoStackItemDetail({ item }: { item: LogoStackItem }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-flex shrink-0">{item.renderIcon("size-5")}</span>
      <span className="min-w-0">
        <span className="block font-medium wrap-anywhere">{item.label}</span>
        {item.detail ? (
          <span className="text-muted-foreground block text-xs wrap-anywhere">
            {item.detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function LogoStack({
  items,
  limit = GEO_GAPS_LOGO_STACK_LIMIT,
  emptyLabel,
  showLabel = false,
}: LogoStackProps) {
  if (items.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">
        {emptyLabel ?? "None"}
      </span>
    );
  }

  const visible = items.slice(0, limit);
  const hidden = items.slice(limit);

  return (
    /*
     * Labelled stacks must be block-level: an inline-flex shrink-wraps its
     * content, so a long brand name would push out of the cell instead of
     * truncating. Bare logo stacks stay inline so they can sit in a sentence.
     */
    <span
      className={
        showLabel
          ? "flex min-w-0 items-center gap-1"
          : "inline-flex items-center gap-1"
      }
    >
      {visible.map((item) => (
        <Tooltip key={item.key}>
          <TooltipTrigger
            // With a visible label the text is already the accessible name.
            aria-label={showLabel ? undefined : item.label}
            render={
              <span
                className={
                  showLabel
                    ? "inline-flex min-w-0 cursor-default items-center gap-1.5"
                    : "inline-flex shrink-0 cursor-default"
                }
              />
            }
            role={showLabel ? undefined : "img"}
          >
            {item.renderIcon("size-4 shrink-0")}
            {showLabel ? (
              <span className="min-w-0 truncate">{item.label}</span>
            ) : null}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <LogoStackItemDetail item={item} />
          </TooltipContent>
        </Tooltip>
      ))}
      {hidden.length > 0 ? (
        <Popover>
          <PopoverTrigger
            aria-label={`Show ${hidden.length} additional items`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-xs tabular-nums outline-none focus-visible:ring-2"
            onClick={(event) => event.stopPropagation()}
            openOnHover
          >
            +{hidden.length}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="max-h-[min(24rem,var(--available-height))] w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
            collisionPadding={8}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2.5">
              <PopoverTitle className="text-xs">Additional items</PopoverTitle>
              <span className="text-muted-foreground text-xs tabular-nums">
                {hidden.length}
              </span>
            </div>
            <div
              aria-label="Additional items"
              className="min-h-0 overflow-y-auto overscroll-contain p-3 focus-visible:outline-2 focus-visible:-outline-offset-2"
              role="region"
              tabIndex={0}
            >
              <ul className="space-y-3">
                {hidden.map((item) => (
                  <li key={item.key}>
                    <LogoStackItemDetail item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </span>
  );
}
