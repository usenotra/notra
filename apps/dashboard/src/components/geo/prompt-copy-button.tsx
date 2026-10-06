"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCopyToClipboard } from "@notra/ui/hooks/use-copy-to-clipboard";
import { SPRING } from "@notra/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { PromptCopyButtonProps } from "@/types/geo-prompt-detail";
import { toastCopyError } from "@/utils/copy-to-clipboard";

const COPIED_RESET_MS = 1400;
const SWOOSH_PX = 8;
const INSTANT = { duration: 0 } as const;

/**
 * Confirms the copy in the control itself instead of a toast: the prompt
 * swooshes out the top, "Copied" comes up from below. An invisible copy of the
 * prompt keeps the box at its original width so the header never reflows.
 * Long prompts truncate to one line; the full text is in the tooltip.
 */
export function PromptCopyButton({ prompt }: PromptCopyButtonProps) {
  const t = useTranslations("geo.promptCopyButton");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common.actions");
  const { copied, copy } = useCopyToClipboard({
    timeout: COPIED_RESET_MS,
    onError: toastCopyError,
  });
  const reduceMotion = useReducedMotion();

  const offset = reduceMotion ? 0 : SWOOSH_PX;
  const blur = reduceMotion ? "blur(0px)" : "blur(4px)";
  const transition = reduceMotion ? INSTANT : SPRING.indicatorFlat;

  return (
    <button
      aria-label={t("actionAria", { prompt })}
      className="hover:bg-muted/60 focus-visible:ring-ring duration-fast -mx-1.5 inline-flex max-w-[calc(100%+0.75rem)] cursor-pointer items-center rounded-md px-1.5 py-0.5 text-left transition-[background-color,scale] ease-out focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]"
      onClick={() => copy(prompt)}
      title={`${prompt}\n\n${tGeoShared("copyPrompt")}`}
      type="button"
    >
      <span className="relative grid min-w-0 grid-cols-1 items-center overflow-hidden">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 truncate"
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
              "col-start-1 row-start-1 min-w-0 truncate",
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
                  className="mr-1.5 inline size-3.5 align-[-2px]"
                  icon={Tick02Icon}
                  strokeWidth={2}
                />
                {tCommon("copied")}
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
