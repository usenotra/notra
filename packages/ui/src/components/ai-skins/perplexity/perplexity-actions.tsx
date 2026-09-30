"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  Download01Icon,
  MoreHorizontalIcon,
  Share03Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";
import { PerplexitySourcesSheet } from "@notra/ui/components/ai-skins/perplexity/perplexity-sources-sheet";
import { Button } from "@notra/ui/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { AI_SKIN_BUTTON_RESET } from "@notra/ui/constants/ai-skin-primitives";
import { cn } from "@notra/ui/lib/utils";
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
              "cursor-pointer rounded-full text-[#8d8d8d] outline-none transition-[color,background-color,transform] duration-fast hover:bg-[#f3f3f3] hover:text-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96] dark:text-[#a3a3a3] dark:hover:bg-white/10 dark:hover:text-foreground dark:focus-visible:ring-white/20 [&_svg:not([class*='size-'])]:size-4"
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

export function PerplexityActions({
  text,
  sources,
  className,
}: {
  text: string;
  sources?: readonly PerplexitySearchSource[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <TooltipProvider delay={200}>
      <div className={cn("flex w-full items-center", className)}>
        <div className="flex items-center gap-1">
          <ActionButton label="Share">
            <HugeiconsIcon icon={Share03Icon} strokeWidth={1.75} />
          </ActionButton>
          <ActionButton label="Download">
            <HugeiconsIcon icon={Download01Icon} strokeWidth={1.75} />
          </ActionButton>
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
          <ActionButton label="Rewrite">
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={1.75} />
          </ActionButton>
        </div>

        {sources && sources.length > 0 ? (
          <PerplexitySourcesSheet sources={sources} />
        ) : null}

        <div className="ms-auto flex items-center gap-1">
          <ActionButton label="Good response">
            <HugeiconsIcon icon={ThumbsUpIcon} strokeWidth={1.75} />
          </ActionButton>
          <ActionButton label="Bad response">
            <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={1.75} />
          </ActionButton>
          <ActionButton label="More">
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.75} />
          </ActionButton>
        </div>
      </div>
    </TooltipProvider>
  );
}
