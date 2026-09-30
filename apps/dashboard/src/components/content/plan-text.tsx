"use client";

import { cn } from "@notra/ui/lib/utils";

import type { PlanTextProps } from "@/types/content/plan";

export function PlanText({
  "aria-label": ariaLabel,
  autoFocus = false,
  className,
  itemId,
  maxLength,
  onChange,
  onCommit,
  onEnter,
  onEscape,
  placeholder,
  readOnly = false,
  ref,
  value,
}: PlanTextProps) {
  return (
    <textarea
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      className={cn(
        "caret-foreground field-sizing-content w-full min-w-0 resize-none bg-transparent",
        "-mx-1 rounded-sm px-1 py-0.5",
        "placeholder:text-muted-foreground/70",
        "hover:bg-muted/40 focus:bg-muted/40",
        "ring-0 outline-none focus-visible:ring-0",
        "read-only:hover:bg-transparent read-only:focus:bg-transparent",
        "read-only:cursor-text read-only:opacity-70",
        className
      )}
      data-plan-id={itemId}
      maxLength={maxLength}
      onBlur={onCommit}
      onChange={(event) =>
        onChange(event.target.value.replaceAll(/\r?\n|\r/g, " "))
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (!onEscape) {
            return;
          }
          event.preventDefault();
          onEscape();
          return;
        }
        if (event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        if (onEnter) {
          onEnter();
          return;
        }
        event.currentTarget.blur();
      }}
      placeholder={placeholder}
      readOnly={readOnly}
      ref={ref}
      rows={1}
      value={value}
    />
  );
}
