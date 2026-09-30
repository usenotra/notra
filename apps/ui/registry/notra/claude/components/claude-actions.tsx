"use client";

import { cn } from "cn";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RotateCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Volume2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  CLAUDE_COPIED_RESET_MS,
  CLAUDE_TOOLTIP_DELAY_MS,
} from "../constants/claude";
import type {
  ClaudeActionButtonProps,
  ClaudeActionsProps,
} from "../types/claude";

const ICON_CLASS = "size-4";

export const ClaudeActionButton = ({
  children,
  label,
  onClick,
}: ClaudeActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={label}
          className="text-claude-muted hover:bg-claude-hover hover:text-claude-fg focus-visible:ring-claude-fg/20 aria-expanded:bg-claude-hover dark:hover:bg-claude-hover size-7 rounded-lg focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0"
          data-slot="claude-action-button"
          onClick={onClick}
          size="icon-sm"
          type="button"
          variant="ghost"
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent
      className="bg-claude-tooltip font-claude text-claude-tooltip-fg rounded-md px-2 py-1 text-xs [&>div]:hidden"
      side="bottom"
      sideOffset={6}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);

export const ClaudeActions = ({
  className,
  from = "assistant",
  onBadResponse,
  onEdit,
  onGoodResponse,
  onReadAloud,
  onRetry,
  text,
  timestamp,
  ...props
}: ClaudeActionsProps) => {
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
      CLAUDE_COPIED_RESET_MS
    );
  };

  const copyButton = (
    <ClaudeActionButton
      label={copied ? "Copied" : "Copy"}
      onClick={() => {
        copy().catch(() => undefined);
      }}
    >
      {copied ? (
        <CheckIcon className={ICON_CLASS} strokeWidth={1.25} />
      ) : (
        <CopyIcon className={ICON_CLASS} strokeWidth={1.25} />
      )}
    </ClaudeActionButton>
  );

  const timestampNode = timestamp && (
    <span
      className={cn(
        "text-xs leading-none",
        from === "user" ? "me-1" : "ms-1.5"
      )}
    >
      {timestamp}
    </span>
  );

  return (
    <TooltipProvider delay={CLAUDE_TOOLTIP_DELAY_MS}>
      <div
        className={cn(
          "font-claude text-claude-muted flex items-center gap-0.5",
          from === "assistant" && "-ms-1.5",
          className
        )}
        data-from={from}
        data-slot="claude-actions"
        {...props}
      >
        {from === "user" ? (
          <>
            {timestampNode}
            <ClaudeActionButton label="Retry" onClick={onRetry}>
              <RotateCcwIcon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            <ClaudeActionButton label="Edit" onClick={onEdit}>
              <PencilIcon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            {copyButton}
          </>
        ) : (
          <>
            {copyButton}
            <ClaudeActionButton label="Read aloud" onClick={onReadAloud}>
              <Volume2Icon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            <ClaudeActionButton label="Good response" onClick={onGoodResponse}>
              <ThumbsUpIcon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            <ClaudeActionButton label="Bad response" onClick={onBadResponse}>
              <ThumbsDownIcon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            <ClaudeActionButton label="Retry" onClick={onRetry}>
              <RotateCcwIcon className={ICON_CLASS} strokeWidth={1.25} />
            </ClaudeActionButton>
            {timestampNode}
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
