"use client";

import { PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { PromptChoiceRowProps } from "@/types/onboarding";

export function PromptChoiceRow({
  prompt,
  selected,
  disabled,
  onToggle,
}: PromptChoiceRowProps) {
  return (
    <li className="w-full max-w-full min-w-0 overflow-hidden">
      <button
        aria-pressed={selected}
        className={cn(
          "border-input hover:bg-muted/40 flex w-full max-w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          selected && "border-primary/40 bg-primary/5"
        )}
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        <span className="line-clamp-2 min-w-0 flex-1 text-sm">{prompt}</span>
        <span
          aria-hidden="true"
          className={cn(
            "border-input text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected && "border-primary bg-primary text-primary-foreground"
          )}
        >
          <HugeiconsIcon
            icon={selected ? Tick02Icon : PlusSignIcon}
            size={14}
          />
        </span>
      </button>
    </li>
  );
}
