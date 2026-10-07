"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import {
  CLAUDE_CODE_RESULT_GLYPH,
  CLAUDE_CODE_SPINNER_FRAMES,
  CLAUDE_CODE_SPINNER_INTERVAL_MS,
} from "../constants/claude-code";
import { renderClaudeCodeInline } from "../lib/claude-code-inline";
import type {
  ClaudeCodeInterruptedProps,
  ClaudeCodeSpinnerProps,
  ClaudeCodeTurnSummaryProps,
} from "../types/claude-code";

const FRAME_CYCLE = [
  ...CLAUDE_CODE_SPINNER_FRAMES,
  ...CLAUDE_CODE_SPINNER_FRAMES.slice(1, -1).reverse(),
];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const useSpinnerFrame = (paused: boolean) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (paused || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      return;
    }
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_CYCLE.length);
    }, CLAUDE_CODE_SPINNER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return FRAME_CYCLE[frame];
};

const formatTokens = (tokens: number) =>
  `↓ ${tokens.toLocaleString("en-US")} tokens`;

export const ClaudeCodeSpinner = ({
  className,
  details = [],
  elapsed,
  paused = false,
  tip,
  tokens,
  verb = "Thinking",
  ...props
}: ClaudeCodeSpinnerProps) => {
  const glyph = useSpinnerFrame(paused);
  const meta = [
    elapsed,
    tokens === undefined ? undefined : formatTokens(tokens),
    ...details,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "font-claude-code text-claude-code-muted flex min-w-0 flex-col text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-spinner"
      role="status"
      {...props}
    >
      <p className="grid grid-cols-[2ch_minmax(0,1fr)]">
        <span aria-hidden="true" className="text-claude-code-accent">
          {glyph}
        </span>
        <span className="min-w-0">
          <span className="text-claude-code-accent">{verb}…</span>
          {meta.length > 0 && <> ({meta.join(" · ")})</>}
        </span>
      </p>
      {tip && (
        <p className="grid grid-cols-[3ch_minmax(0,1fr)] pl-[2ch]">
          <span aria-hidden="true">{CLAUDE_CODE_RESULT_GLYPH}</span>
          <span className="min-w-0">{renderClaudeCodeInline(tip)}</span>
        </p>
      )}
    </div>
  );
};

export const ClaudeCodeTurnSummary = ({
  className,
  doneAt,
  duration,
  verb = "Worked",
  ...props
}: ClaudeCodeTurnSummaryProps) => (
  <p
    className={cn(
      "font-claude-code text-claude-code-muted grid min-w-0 grid-cols-[2ch_minmax(0,1fr)] text-[0.8125rem] leading-5",
      className
    )}
    data-slot="claude-code-turn-summary"
    {...props}
  >
    <span aria-hidden="true">✻</span>
    <span className="min-w-0">
      {verb} for {duration}
      {doneAt && <> · done {doneAt}</>}
    </span>
  </p>
);

export const ClaudeCodeInterrupted = ({
  className,
  hint = "What should Claude do instead?",
  ...props
}: ClaudeCodeInterruptedProps) => (
  <p
    className={cn(
      "font-claude-code text-claude-code-muted grid min-w-0 grid-cols-[3ch_minmax(0,1fr)] pl-[2ch] text-[0.8125rem] leading-5",
      className
    )}
    data-slot="claude-code-interrupted"
    role="status"
    {...props}
  >
    <span aria-hidden="true">{CLAUDE_CODE_RESULT_GLYPH}</span>
    <span className="min-w-0">
      <span className="text-claude-code-error">Interrupted</span>
      {hint && <> · {hint}</>}
    </span>
  </p>
);
