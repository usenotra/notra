"use client";

import { cn } from "cn";
import {
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  RefreshCwIcon,
  ShareIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import {
  CHATGPT_COPIED_RESET_MS,
  CHATGPT_TOOLTIP_DELAY_MS,
} from "../constants/chatgpt";
import type { ChatgptActionsProps } from "../types/chatgpt";
import { ChatgptActionButton } from "./chatgpt-action-button";

const ICON_STROKE = 1.75;

const ICON_CLASS_NAME = "size-5";

export const ChatgptActions = ({
  className,
  onMore,
  onRedo,
  onShare,
  text,
  ...props
}: ChatgptActionsProps) => {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetRef.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(resetRef.current);
    resetRef.current = window.setTimeout(
      () => setCopied(false),
      CHATGPT_COPIED_RESET_MS
    );
  };

  return (
    <TooltipProvider delay={CHATGPT_TOOLTIP_DELAY_MS}>
      <div
        className={cn(
          "font-chatgpt text-chatgpt-muted flex items-center gap-0.5",
          className
        )}
        data-slot="chatgpt-actions"
        {...props}
      >
        <ChatgptActionButton
          label={copied ? "Copied" : "Copy"}
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE} />
          ) : (
            <CopyIcon className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE} />
          )}
        </ChatgptActionButton>
        <ChatgptActionButton label="Share" onClick={onShare}>
          <ShareIcon className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE} />
        </ChatgptActionButton>
        <ChatgptActionButton label="Redo" onClick={onRedo}>
          <RefreshCwIcon
            className={ICON_CLASS_NAME}
            strokeWidth={ICON_STROKE}
          />
        </ChatgptActionButton>
        <ChatgptActionButton label="More" onClick={onMore}>
          <EllipsisIcon className={ICON_CLASS_NAME} strokeWidth={ICON_STROKE} />
        </ChatgptActionButton>
      </div>
    </TooltipProvider>
  );
};
