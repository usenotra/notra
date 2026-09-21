"use client";

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
        <span className="block font-medium">{item.label}</span>
        {item.detail ? (
          <span className="block text-muted-foreground text-xs">
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
        <Tooltip>
          <TooltipTrigger
            aria-label={`Additional: ${hidden.map((item) => item.label).join(", ")}`}
            render={
              <span className="shrink-0 cursor-default text-muted-foreground text-xs" />
            }
          >
            +{hidden.length}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <span className="flex flex-col gap-1.5">
              {hidden.map((item) => (
                <LogoStackItemDetail item={item} key={item.key} />
              ))}
            </span>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}
