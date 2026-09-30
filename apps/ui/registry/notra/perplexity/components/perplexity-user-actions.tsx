"use client";

import { cn } from "cn";
import { Check, Copy, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  PERPLEXITY_COPIED_RESET_MS,
  PERPLEXITY_TOOLTIP_DELAY_MS,
} from "../constants/perplexity";
import type { PerplexityUserActionsProps } from "../types/perplexity";

const ICON_STROKE = 1.75;

interface UserActionButtonProps extends ComponentProps<typeof Button> {
  children: ReactNode;
  label: string;
}

const UserActionButton = ({
  children,
  label,
  ...props
}: UserActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={label}
          className="text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg focus-visible:ring-pplx-ring dark:hover:bg-pplx-hover size-8 rounded-full transition-[color,background-color,transform] duration-150 focus-visible:border-transparent focus-visible:ring-2 active:scale-[0.96] active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none [&_svg]:size-4"
          size="icon"
          variant="ghost"
          {...props}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent
      className="bg-pplx-fg font-pplx text-pplx-bg [&>div]:bg-pplx-fg [&>div]:fill-pplx-fg"
      side="bottom"
      sideOffset={6}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);

export const PerplexityUserActions = ({
  className,
  onEdit,
  text,
  timestamp,
  ...props
}: PerplexityUserActionsProps) => {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(resetRef.current);
    resetRef.current = window.setTimeout(
      () => setCopied(false),
      PERPLEXITY_COPIED_RESET_MS
    );
  };

  return (
    <TooltipProvider delay={PERPLEXITY_TOOLTIP_DELAY_MS}>
      <div
        className={cn(
          "font-pplx text-pplx-muted flex shrink-0 items-center gap-1 text-sm leading-5 tabular-nums",
          className
        )}
        data-slot="perplexity-user-actions"
        {...props}
      >
        {timestamp ? <span className="pe-1">{timestamp}</span> : null}
        <UserActionButton label="Edit" onClick={onEdit}>
          <Pencil strokeWidth={ICON_STROKE} />
        </UserActionButton>
        <UserActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
          {copied ? (
            <Check strokeWidth={ICON_STROKE} />
          ) : (
            <Copy strokeWidth={ICON_STROKE} />
          )}
        </UserActionButton>
      </div>
    </TooltipProvider>
  );
};
