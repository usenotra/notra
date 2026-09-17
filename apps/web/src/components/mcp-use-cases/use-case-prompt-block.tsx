"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { McpUseCasePromptBlockProps } from "@/types/mcp-use-cases";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { McpUseCaseToolBadge } from "./use-case-tool-icon";

const COPIED_STATE_DURATION_MS = 2000;

const BAND_CLASS =
  "flex flex-wrap items-center gap-x-4 gap-y-3 bg-[#F7F7F8] px-5 sm:px-6 dark:bg-white/[0.04]";

export function McpUseCasePromptBlock({ entry }: McpUseCasePromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    <section className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:bg-white/[0.02] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div
        className={`${BAND_CLASS} justify-between border-b border-[#ECECEC] py-3.5 dark:border-white/10`}
      >
        <h2 className="font-sans text-[0.9375rem] leading-[1.33] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
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
      <p className="px-5 py-6 font-sans text-[1.0625rem] leading-[1.6] tracking-[-0.005em] text-[#1E1E1E] sm:px-6 sm:py-7 dark:text-white/90">
        {entry.prompt}
      </p>
      <div
        className={`${BAND_CLASS} border-t border-[#ECECEC] py-3.5 dark:border-white/10`}
      >
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
