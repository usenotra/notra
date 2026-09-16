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
    <section className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:bg-white/[0.02] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECECEC] px-5 py-4 sm:px-6 dark:border-white/10">
        <div className="flex items-center gap-3">
          <McpUseCaseStack stack={entry.stack} />
          <span className="font-sans text-[0.9375rem] leading-[1.33] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            Prompt
          </span>
        </div>
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
      <pre className="px-5 py-5 font-mono text-[0.875rem] leading-[1.7] whitespace-pre-wrap text-[#1E1E1EBF] sm:px-6 dark:text-white/75">
        {entry.prompt}
      </pre>
      <div className="flex flex-col gap-2.5 border-t border-[#ECECEC] px-5 py-4 sm:px-6 dark:border-white/10">
        <span className="font-sans text-[0.75rem] leading-[1.33] font-medium tracking-[0.04em] text-[#1E1E1E80] uppercase dark:text-white/50">
          Tools this workflow calls
        </span>
        <ul className="flex flex-wrap gap-2">
          {entry.tools.map((tool) => (
            <li
              className="rounded-md bg-[#F4F4F5] px-2 py-1 font-mono text-[0.75rem] leading-[1.33] text-[#1E1E1E] dark:bg-white/[0.06] dark:text-white/80"
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
