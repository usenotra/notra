import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { McpUseCaseStack } from "@/components/mcp-use-cases/use-case-tool-icon";
import { MCP_USE_CASES, MCP_USE_CASES_PATH } from "@/constants/mcp-use-cases";
import { formatMcpUseCasesCalloutLabel } from "@/utils/mcp";

const CALLOUT_STACK = MCP_USE_CASES.slice(0, 3).flatMap((entry) => entry.stack);
const CALLOUT_STACK_UNIQUE = [...new Set(CALLOUT_STACK)].slice(0, 5);

export function McpUseCasesCallout() {
  return (
    <section className="flex flex-col items-start justify-between gap-5 rounded-[1.25rem] bg-[#C8B2EE40] p-6 sm:flex-row sm:items-center sm:p-8 dark:bg-[#231d3a]">
      <div className="flex flex-col gap-3">
        <McpUseCaseStack stack={CALLOUT_STACK_UNIQUE} />
        <div className="flex flex-col gap-1">
          <h2 className="font-sans text-[1.375rem]/7 font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
            Not sure what to ask your agent?
          </h2>
          <p className="max-w-[32rem] font-sans text-[0.9375rem] leading-[1.5] text-[#1E1E1EBF] dark:text-white/70">
            {formatMcpUseCasesCalloutLabel(MCP_USE_CASES.length)}
          </p>
        </div>
      </div>
      <Link
        className="cta-gradient-primary-flat flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-5.5 py-2.75 font-sans text-[0.875rem] leading-[1.29] font-semibold text-white"
        href={MCP_USE_CASES_PATH}
      >
        Browse use cases
        <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
      </Link>
    </section>
  );
}
