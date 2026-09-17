"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { McpUseCasePromptBlockProps } from "@/types/mcp-use-cases";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { McpUseCaseToolBadge } from "./use-case-tool-icon";

const COPIED_STATE_DURATION_MS = 2000;
const COPY_LABEL_SHIFT_PX = 6;
const COPY_LABEL_TRANSITION = {
  duration: 0.1,
  ease: [0.23, 1, 0.32, 1] as const,
};

export function McpUseCasePromptBlock({ entry }: McpUseCasePromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const integrations = entry.stack.filter((toolId) => toolId !== "notra");

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    []
  );

  async function handleCopy() {
    const success = await copyToClipboard(entry.prompt, "Prompt copied");
    if (!success) {
      return;
    }
    setCopied(true);
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_STATE_DURATION_MS);
  }

  return (
    <section className="flex w-full flex-col rounded-[1.25rem] bg-[#F1F1F3] p-1 dark:bg-white/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
        <h2 className="font-sans text-[0.9375rem] leading-[1.33] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
          Prompt
        </h2>
        <LazyMotion features={domAnimation}>
          <button
            aria-label={copied ? "Prompt copied" : "Copy prompt"}
            className="focus-visible:ring-primary grid cursor-pointer rounded-full bg-white px-3.5 py-1.75 font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E] [box-shadow:#E4E4E7_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] transition-[background-color,transform] duration-75 ease-out outline-none hover:bg-[#FAFAFA] focus-visible:ring-2 active:scale-[0.98] dark:bg-white/[0.08] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem] dark:hover:bg-white/[0.12]"
            onClick={handleCopy}
            type="button"
          >
            <m.span
              animate={{
                opacity: copied ? 0 : 1,
                y: copied && !reduceMotion ? -COPY_LABEL_SHIFT_PX : 0,
              }}
              aria-hidden={copied}
              className="col-start-1 row-start-1 flex items-center justify-center gap-1.5"
              initial={false}
              transition={COPY_LABEL_TRANSITION}
            >
              <HugeiconsIcon className="size-3.5" icon={Copy01Icon} />
              <span>Copy prompt</span>
            </m.span>
            <m.span
              animate={{
                opacity: copied ? 1 : 0,
                y: copied || reduceMotion ? 0 : COPY_LABEL_SHIFT_PX,
              }}
              aria-hidden={!copied}
              className="col-start-1 row-start-1 flex items-center justify-center gap-1.5"
              initial={false}
              transition={COPY_LABEL_TRANSITION}
            >
              <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
              <span>Copied</span>
            </m.span>
          </button>
        </LazyMotion>
      </div>
      <div className="relative rounded-[1rem] bg-white px-5 py-5 [box-shadow:#E4E4E7_0_0_0_0.0625rem,#0A0D140A_0_0.0625rem_0.125rem] sm:px-6 sm:py-6 dark:bg-[#161618] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem,#FFFFFF0F_0_-0.0625rem_0_inset]">
        <p className="font-sans text-[1.0625rem] leading-[1.6] tracking-[-0.005em] text-[#1E1E1E] dark:text-white/90">
          {entry.prompt}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-4 py-3">
        <span className="font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E80] dark:text-white/50">
          Runs on
        </span>
        <Link
          className="focus-visible:ring-primary rounded-full outline-none focus-visible:ring-2"
          href="/mcp"
        >
          <McpUseCaseToolBadge
            className="transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.1]"
            label="Notra MCP"
            toolId="notra"
          />
        </Link>
        {integrations.length > 0 ? (
          <>
            <span className="font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E80] dark:text-white/50">
              with
            </span>
            {integrations.map((toolId) => (
              <McpUseCaseToolBadge key={toolId} toolId={toolId} />
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
