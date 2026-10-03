"use client";

import { cn } from "cn";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { TooltipProvider } from "@/components/ui/tooltip";

import { GEMINI_TOOLTIP_DELAY_MS } from "../constants/gemini";
import type { GeminiActionsProps } from "../types/gemini";
import { GeminiActionButton } from "./gemini-action-button";

const ICON_STROKE = 1.5;

export const GeminiActions = ({
  className,
  onBadResponse,
  onGoodResponse,
  ...props
}: GeminiActionsProps) => (
  <TooltipProvider delay={GEMINI_TOOLTIP_DELAY_MS}>
    <div
      className={cn("flex items-center gap-1", className)}
      data-slot="gemini-actions"
      {...props}
    >
      <GeminiActionButton label="Good response" onClick={onGoodResponse}>
        <ThumbsUpIcon strokeWidth={ICON_STROKE} />
      </GeminiActionButton>
      <GeminiActionButton label="Bad response" onClick={onBadResponse}>
        <ThumbsDownIcon strokeWidth={ICON_STROKE} />
      </GeminiActionButton>
    </div>
  </TooltipProvider>
);
