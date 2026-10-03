"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  MoreHorizontalIcon,
  Share01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { AI_SKIN_BUTTON_RESET } from "@notra/ui/constants/ai-skin-primitives";
import type { ReactNode } from "react";
import { useState } from "react";

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className={cn(
              AI_SKIN_BUTTON_RESET,
              "rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted [&_svg:not([class*='size-'])]:size-4"
            )}
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

export function ChatgptActions({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <TooltipProvider delay={200}>
      <div
        className={cn(
          "flex items-center gap-0.5 text-muted-foreground",
          className
        )}
      >
        <ActionButton
          label={copied ? "Copied" : "Copy"}
          onClick={() => {
            void navigator.clipboard
              .writeText(text)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => undefined);
          }}
        >
          <HugeiconsIcon
            icon={copied ? Tick01Icon : Copy01Icon}
            strokeWidth={1.75}
          />
        </ActionButton>
        <ActionButton label="Share">
          <HugeiconsIcon icon={Share01Icon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Redo">
          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="More">
          <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.75} />
        </ActionButton>
      </div>
    </TooltipProvider>
  );
}
