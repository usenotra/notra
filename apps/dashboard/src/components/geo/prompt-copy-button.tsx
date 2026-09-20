"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PROMPT_COPY_LABELS } from "@notra/geo-core/constants/geo";
import { SPRING } from "@notra/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { PromptCopyButtonProps } from "@/types/geo-prompt-detail";

const COPIED_RESET_MS = 1400;
const SWOOSH_PX = 8;
const INSTANT = { duration: 0 } as const;

/**
 * Confirms the copy in the control itself instead of a toast: the prompt
 * swooshes out the top, "Copied" comes up from below. An invisible copy of the
 * prompt keeps the box at its original width so the header never reflows.
 */
export function PromptCopyButton({ prompt }: PromptCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy() {
    if (!navigator.clipboard?.writeText) {
      toast.error(GEO_PROMPT_COPY_LABELS.unsupported);
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      toast.error(GEO_PROMPT_COPY_LABELS.failed);
      return;
    }
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(
      () => setCopied(false),
      COPIED_RESET_MS
    );
  }

  const offset = reduceMotion ? 0 : SWOOSH_PX;
  const blur = reduceMotion ? "blur(0px)" : "blur(4px)";
  const transition = reduceMotion ? INSTANT : SPRING.indicatorFlat;

  return (
    <button
      aria-label={`${GEO_PROMPT_COPY_LABELS.action}: ${prompt}`}
      className="bg-background hover:bg-muted/50 focus-visible:ring-ring duration-fast inline-flex max-w-full cursor-pointer items-center rounded-md border px-2 py-1 text-left shadow-xs transition-[background-color,scale] ease-out focus-visible:ring-2 focus-visible:outline-none active:scale-[0.96]"
      onClick={copy}
      title={GEO_PROMPT_COPY_LABELS.action}
      type="button"
    >
      <span className="relative grid min-w-0 items-center overflow-hidden">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 wrap-anywhere"
        >
          {prompt}
        </span>
        {/*
         * No `popLayout`: it takes the leaving label out of flow with
         * `position: absolute`, which on the first swap lands it outside the
         * button. Both labels already share one grid cell, so they overlap on
         * their own.
         */}
        <AnimatePresence initial={false}>
          <motion.span
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className={cn(
              "col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 wrap-anywhere",
              copied && "text-geo-up font-medium"
            )}
            exit={{ opacity: 0, y: -offset, filter: blur }}
            initial={{ opacity: 0, y: offset, filter: blur }}
            key={copied ? "copied" : "prompt"}
            transition={transition}
          >
            {copied ? (
              <>
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  icon={Tick02Icon}
                  strokeWidth={2}
                />
                {GEO_PROMPT_COPY_LABELS.copied}
              </>
            ) : (
              prompt
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
