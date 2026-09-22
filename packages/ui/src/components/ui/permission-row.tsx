"use client";

import { domMax, LazyMotion } from "motion/react";
import type { KeyboardEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { cn } from "@notra/ui/lib/utils";
import {
  type PermissionIndicatorMotion,
  PermissionRowContext,
  type PermissionRowContextValue,
} from "./permission-selector-context";

const RADIO_NAVIGATION_KEYS = [
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
  "ArrowUp",
  "Home",
  "End",
];

function handlePermissionRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (!RADIO_NAVIGATION_KEYS.includes(event.key)) {
    return;
  }

  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not(:disabled)'
    )
  );
  if (!options.length) {
    return;
  }

  event.preventDefault();

  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option === document.activeElement)
  );
  let nextIndex = (currentIndex + 1) % options.length;

  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = options.length - 1;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + options.length) % options.length;
  }
  const nextOption = options[nextIndex];

  nextOption?.focus();
  nextOption?.click();
}

export interface PermissionRowProps {
  children: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  layout?: "row" | "compact";
  indicatorMotion?: PermissionIndicatorMotion;
}

export function PermissionRow({
  children,
  label,
  description,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  layout = "row",
  indicatorMotion = "spring",
}: PermissionRowProps) {
  const layoutId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value ?? internalValue;

  const select = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  const context: PermissionRowContextValue = {
    value: activeValue,
    select,
    layoutId,
    indicatorMotion,
    disabled,
  };

  const ariaLabel = typeof label === "string" ? label : undefined;
  const optionGroup = (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex shrink-0 items-center gap-0.5 overflow-hidden rounded-lg border bg-muted/40 p-0.5",
        layout === "compact" && className
      )}
      onKeyDown={handlePermissionRowKeyDown}
      role="radiogroup"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );

  return (
    <PermissionRowContext.Provider value={context}>
      <LazyMotion features={domMax}>
        {layout === "compact" ? (
          <div className="max-w-full min-w-0 overflow-x-auto">{optionGroup}</div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3",
              className
            )}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground text-sm">
                {label}
              </span>
              {description && (
                <span className="text-muted-foreground text-xs">
                  {description}
                </span>
              )}
            </div>
            {optionGroup}
          </div>
        )}
      </LazyMotion>
    </PermissionRowContext.Provider>
  );
}
