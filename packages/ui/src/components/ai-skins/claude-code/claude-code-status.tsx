"use client";

import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

import { renderClaudeCodeInline } from "./claude-code-inline";

const SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽"];
const FRAME_CYCLE = [...SPINNER_FRAMES, ...SPINNER_FRAMES.slice(1, -1).reverse()];
const SPINNER_INTERVAL_MS = 120;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useSpinnerFrame(paused: boolean) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (paused || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      return;
    }
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_CYCLE.length);
    }, SPINNER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return FRAME_CYCLE[frame];
}

/** The orange "✻ Sketching… (14s · ↓ 688 tokens)" line while Claude works. */
export function ClaudeCodeSpinner({
  verb = "Thinking",
  elapsed,
  tokens,
  details = [],
  tip,
  paused = false,
  className,
}: {
  verb?: string;
  elapsed?: string;
  tokens?: number;
  /** Extra fields in the parentheses, like `thinking`. */
  details?: string[];
  tip?: string;
  /** Freeze the glyph. */
  paused?: boolean;
  className?: string;
}) {
  const glyph = useSpinnerFrame(paused);
  const meta = [
    elapsed,
    tokens === undefined ? undefined : `↓ ${tokens.toLocaleString("en-US")} tokens`,
    ...details,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col font-mono text-[13px] leading-5 text-[#8c8c8c]",
        className
      )}
      role="status"
    >
      <p className="grid grid-cols-[2ch_minmax(0,1fr)]">
        <span aria-hidden="true" className="text-[#e06443]">
          {glyph}
        </span>
        <span className="min-w-0">
          <span className="text-[#e06443]">{verb}…</span>
          {meta.length > 0 ? ` (${meta.join(" · ")})` : null}
        </span>
      </p>
      {tip ? (
        <p className="grid grid-cols-[3ch_minmax(0,1fr)] pl-[2ch]">
          <span aria-hidden="true">⎿</span>
          <span className="min-w-0">{renderClaudeCodeInline(tip)}</span>
        </p>
      ) : null}
    </div>
  );
}

/** The dim "✻ Worked for 19s · done 9:42 AM" line after a turn. */
export function ClaudeCodeTurnSummary({
  verb = "Worked",
  duration,
  doneAt,
  className,
}: {
  verb?: string;
  duration: string;
  doneAt?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "grid min-w-0 grid-cols-[2ch_minmax(0,1fr)] font-mono text-[13px] leading-5 text-[#8c8c8c]",
        className
      )}
    >
      <span aria-hidden="true">✻</span>
      <span className="min-w-0">
        {verb} for {duration}
        {doneAt ? ` · done ${doneAt}` : null}
      </span>
    </p>
  );
}
