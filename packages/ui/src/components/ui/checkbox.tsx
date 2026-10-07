"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@notra/ui/lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer border-foreground/25 bg-background flex size-4 shrink-0 items-center justify-center rounded-[5px] border shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "dark:not-data-checked:not-data-indeterminate:bg-input/30",
        className
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="group/indicator flex items-center justify-center text-current"
        data-slot="checkbox-indicator"
      >
        <HugeiconsIcon
          className="size-3 group-data-indeterminate/indicator:hidden"
          icon={Tick02Icon}
          strokeWidth={2.5}
        />
        <HugeiconsIcon
          className="hidden size-3 group-data-indeterminate/indicator:block"
          icon={MinusSignIcon}
          strokeWidth={2.5}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
