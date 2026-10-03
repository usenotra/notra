"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  PencilEdit02Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick01Icon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
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
          <Button
            aria-label={label}
            className="size-7 text-[#8a8680] hover:text-[#1f1e1b] dark:hover:text-foreground"
            onClick={onClick}
            size="icon-sm"
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

export function ClaudeChatActions({
  text,
  from = "assistant",
  timestamp = "jetzt",
  className,
}: {
  text: string;
  from?: "user" | "assistant";
  timestamp?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }

  const copyButton = (
    <ActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
      <HugeiconsIcon
        icon={copied ? Tick01Icon : Copy01Icon}
        strokeWidth={1.75}
      />
    </ActionButton>
  );

  if (from === "user") {
    return (
      <TooltipProvider delay={200}>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[#8a8680]",
            className
          )}
        >
          <span className="mr-1 font-sans text-[12px] leading-none">
            {timestamp}
          </span>
          <ActionButton label="Redo">
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              strokeWidth={1.75}
            />
          </ActionButton>
          <ActionButton label="Edit">
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.75} />
          </ActionButton>
          {copyButton}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <div
        className={cn(
          "-ms-1.5 flex items-center gap-0.5 text-[#8a8680]",
          className
        )}
      >
        {copyButton}
        <ActionButton label="Read aloud">
          <HugeiconsIcon icon={VolumeHighIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Good response">
          <HugeiconsIcon icon={ThumbsUpIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Bad response">
          <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={1.75} />
        </ActionButton>
        <ActionButton label="Retry">
          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={1.75} />
        </ActionButton>
        <span className="ml-1.5 font-sans text-[12px] leading-none">
          {timestamp}
        </span>
      </div>
    </TooltipProvider>
  );
}
