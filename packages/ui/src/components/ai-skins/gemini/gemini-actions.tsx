"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  Copy01Icon,
  MoreHorizontalIcon,
  Share03Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
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
          <button
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-full text-[#1f1f1f] transition-colors hover:bg-[#f1f3f4] dark:text-foreground dark:hover:bg-white/10 [&_svg]:size-5"
            onClick={onClick}
            type="button"
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

export function GeminiActions({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <TooltipProvider delay={200}>
      <div className={cn("flex items-center gap-1", className)}>
        <ActionButton label="Good response">
          <HugeiconsIcon icon={ThumbsUpIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Bad response">
          <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Share">
          <HugeiconsIcon icon={Share03Icon} strokeWidth={1.75} />
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
        <ActionButton label="More">
          <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.75} />
        </ActionButton>
      </div>
    </TooltipProvider>
  );
}
