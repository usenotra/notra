import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import type { McpUseCaseCardProps } from "@/types/mcp-use-cases";
import {
  formatMcpUseCaseToolCount,
  getMcpUseCaseCategory,
  getMcpUseCaseHref,
} from "@/utils/mcp-use-cases";

import { McpUseCaseStack } from "./use-case-tool-icon";

const CARD_RING =
  "[box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]";

export function McpUseCaseCard({ entry }: McpUseCaseCardProps) {
  const category = getMcpUseCaseCategory(entry.category);

  return (
    <article
      className={`group relative flex h-full flex-col rounded-[1.25rem] bg-white p-5 transition-[box-shadow] duration-200 hover:[box-shadow:#E0E0E0_0_0_0_0.0625rem,#28282814_0_0.25rem_1rem] dark:bg-white/[0.02] dark:hover:[box-shadow:#FFFFFF29_0_0_0_0.0625rem] ${CARD_RING}`}
    >
      <Link
        aria-label={`View ${entry.title}`}
        className="focus-visible:ring-primary absolute inset-0 z-0 cursor-pointer rounded-[1.25rem] outline-none focus-visible:ring-2"
        href={getMcpUseCaseHref(entry)}
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <McpUseCaseStack stack={entry.stack} />
        <div className="flex flex-col gap-1.5 pt-5">
          <h3 className="font-sans text-[1.0625rem] leading-[1.29] font-semibold tracking-[-0.01em] text-balance text-[#1E1E1E] dark:text-white">
            {entry.title}
          </h3>
          <p className="line-clamp-2 font-sans text-[0.875rem] leading-[1.46] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
            {entry.tagline}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-6 font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <HugeiconsIcon className="size-3.5 shrink-0" icon={category.icon} />
            <span className="truncate">{category.label}</span>
          </span>
          <span className="shrink-0">
            {formatMcpUseCaseToolCount(entry.tools.length)}
          </span>
        </div>
      </div>
    </article>
  );
}
