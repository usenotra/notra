"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import type { McpUseCasePromptBlockProps } from "@/types/mcp-use-cases";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { McpUseCaseStack } from "./use-case-tool-icon";

const COPIED_STATE_DURATION_MS = 2000;

export function McpUseCasePromptBlock({ entry }: McpUseCasePromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <section className="flex w-full flex-col gap-5 rounded-[1.25rem] bg-white p-6 [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] sm:p-8 dark:bg-white/[0.02] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-sans text-[1.125rem] leading-[1.33] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
          Prompt
        </h2>
        <button
          aria-label={copied ? "Prompt copied" : "Copy prompt"}
          className="focus-visible:ring-primary flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.75 font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] transition-colors outline-none hover:bg-[#FAFAFA] focus-visible:ring-2 dark:bg-white/[0.08] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem] dark:hover:bg-white/[0.12]"
          onClick={handleCopy}
          type="button"
        >
          <HugeiconsIcon
            className="size-3.5"
            icon={copied ? Tick02Icon : Copy01Icon}
          />
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>
      <p className="font-sans text-[1.0625rem] leading-[1.6] tracking-[-0.005em] text-[#1E1E1E] dark:text-white/90">
        {entry.prompt}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#ECECEC] pt-5 dark:border-white/10">
        <McpUseCaseStack stack={entry.stack} />
        <ul className="flex flex-wrap gap-1.5">
          {entry.tools.map((tool) => (
            <li
              className="rounded-md bg-[#F4F4F5] px-2 py-1 font-mono text-[0.75rem] leading-[1.33] text-[#1E1E1EA6] dark:bg-white/[0.06] dark:text-white/60"
              key={tool}
            >
              {tool}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
