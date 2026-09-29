"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import { Shimmer } from "../../shimmer/components/shimmer";
import {
  CLAUDE_THINKING_INTERVAL_MS,
  CLAUDE_THINKING_VERBS,
} from "../constants/claude";
import { useClaudeReducedMotion } from "../hooks/use-claude-reduced-motion";
import type { ClaudeThinkingProps } from "../types/claude";
import { ClaudeSpinner } from "./claude-spinner";

export const ClaudeThinking = ({
  className,
  intervalMs = CLAUDE_THINKING_INTERVAL_MS,
  reducedMotion,
  verbs = CLAUDE_THINKING_VERBS,
  ...props
}: ClaudeThinkingProps) => {
  const reduced = useClaudeReducedMotion(reducedMotion);
  const [verbIndex, setVerbIndex] = useState(0);
  const verb =
    verbs[verbIndex % verbs.length] ?? verbs[0] ?? CLAUDE_THINKING_VERBS[0];

  useEffect(() => {
    if (reduced || verbs.length <= 1) {
      return;
    }

    const id = window.setInterval(() => {
      setVerbIndex((current) => (current + 1) % verbs.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, reduced, verbs]);

  return (
    <div
      aria-live="polite"
      className={cn("text-claude-text flex items-center gap-3.5", className)}
      data-slot="claude-thinking"
      role="status"
      {...props}
    >
      <ClaudeSpinner
        animated
        aria-hidden="true"
        reducedMotion={reduced}
        size={16}
      />
      <Shimmer
        className="text-[0.9375rem] leading-6 [--shimmer-highlight:var(--claude-fg)]"
        paused={reduced}
      >
        {verb}
      </Shimmer>
    </div>
  );
};
