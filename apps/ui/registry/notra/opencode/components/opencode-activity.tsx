"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  OPENCODE_ACTIVITY_GLYPH,
  OPENCODE_ACTIVITY_LABEL,
  OPENCODE_THINKING_FRAME_MS,
  OPENCODE_THINKING_FRAMES,
} from "../constants/opencode";
import { useOpencodeFrame } from "../hooks/use-opencode-frame";
import { useOpencodeReducedMotion } from "../hooks/use-opencode-reduced-motion";
import type { OpencodeActivityProps } from "../types/opencode";

const TRIGGER_CLASS =
  "focus-visible:ring-opencode-blue h-auto justify-start gap-0 rounded-none p-0 text-start text-[length:inherit] leading-[inherit] font-normal whitespace-normal text-current hover:bg-transparent hover:text-current focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent aria-expanded:text-current dark:hover:bg-transparent";

const ThinkingGlyph = ({ reducedMotion }: { reducedMotion?: boolean }) => {
  const reduced = useOpencodeReducedMotion(reducedMotion);
  const frame = useOpencodeFrame(
    OPENCODE_THINKING_FRAMES.length,
    OPENCODE_THINKING_FRAME_MS,
    !reduced
  );
  return (
    <span aria-hidden="true" className="inline-block w-[2ch] shrink-0">
      {OPENCODE_THINKING_FRAMES[frame]}
    </span>
  );
};

export const OpencodeActivity = ({
  children,
  className,
  defaultOpen = false,
  detail,
  duration,
  kind = "tool",
  label,
  pending = false,
  reducedMotion,
  ...props
}: OpencodeActivityProps) => {
  const isThought = kind === "thought";
  const glyph = OPENCODE_ACTIVITY_GLYPH[kind];
  const name = label ?? OPENCODE_ACTIVITY_LABEL[kind];

  const summary =
    isThought && pending ? (
      <>
        <ThinkingGlyph reducedMotion={reducedMotion} />
        <span>Thinking</span>
      </>
    ) : (
      <>
        {glyph && (
          <span aria-hidden="true" className="inline-block w-[2ch] shrink-0">
            {glyph}
          </span>
        )}
        <span className="min-w-0 wrap-break-word">
          {name}
          {detail && <> {detail}</>}
          {duration && <> · {duration}</>}
        </span>
      </>
    );

  return (
    <Collapsible
      className={cn(
        "ps-[3ch]",
        isThought ? "text-opencode-orange" : "text-opencode-muted",
        className
      )}
      data-kind={kind}
      data-slot="opencode-activity"
      defaultOpen={defaultOpen}
      {...props}
    >
      {children ? (
        <CollapsibleTrigger
          render={<Button className={TRIGGER_CLASS} variant="ghost" />}
        >
          <span className="flex min-w-0">{summary}</span>
        </CollapsibleTrigger>
      ) : (
        <div className="flex min-w-0">{summary}</div>
      )}
      {children && (
        <CollapsibleContent>
          <div
            className={cn(
              "text-opencode-muted mt-[1lh] whitespace-pre-wrap",
              isThought ? "italic" : "ps-[2ch]"
            )}
          >
            {children}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
