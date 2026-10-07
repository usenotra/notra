"use client";

import {
  OPENCODE_ACTIVITY_GLYPH,
  OPENCODE_ACTIVITY_LABEL,
  OPENCODE_THINKING_FRAME_MS,
  OPENCODE_THINKING_FRAMES,
} from "@notra/ui/constants/opencode-skin";
import { useOpencodeFrame } from "@notra/ui/hooks/use-opencode-frame";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeActivityProps } from "@notra/ui/types/opencode-skin";
import { useReducedMotion } from "motion/react";

function ThinkingGlyph({ reducedMotion }: { reducedMotion?: boolean }) {
  const prefersReduced = useReducedMotion();
  const frame = useOpencodeFrame(
    OPENCODE_THINKING_FRAMES.length,
    OPENCODE_THINKING_FRAME_MS,
    !(reducedMotion ?? prefersReduced)
  );
  return (
    <span aria-hidden className="inline-block w-[2ch] shrink-0">
      {OPENCODE_THINKING_FRAMES[frame]}
    </span>
  );
}

export function OpencodeActivity({
  kind = "tool",
  label,
  detail,
  duration,
  pending = false,
  reducedMotion,
  className,
}: OpencodeActivityProps) {
  const thought = kind === "thought";
  const glyph = OPENCODE_ACTIVITY_GLYPH[kind];

  return (
    <div
      className={cn(
        "flex min-w-0 pl-[3ch] font-mono text-[13px] leading-5",
        thought ? "text-opencode-tui-orange" : "text-opencode-tui-muted",
        className
      )}
      data-kind={kind}
    >
      {thought && pending ? (
        <>
          <ThinkingGlyph reducedMotion={reducedMotion} />
          <span>Thinking</span>
        </>
      ) : (
        <>
          {glyph ? (
            <span aria-hidden className="inline-block w-[2ch] shrink-0">
              {glyph}
            </span>
          ) : null}
          <span className="min-w-0 break-words">
            {label ?? OPENCODE_ACTIVITY_LABEL[kind]}
            {detail ? ` ${detail}` : null}
            {duration ? ` · ${duration}` : null}
          </span>
        </>
      )}
    </div>
  );
}
