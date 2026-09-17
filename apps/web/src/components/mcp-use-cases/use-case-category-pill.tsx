import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";

import type { McpUseCaseCategoryPillProps } from "@/types/mcp-use-cases";

const MCP_USE_CASE_PILL_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 font-sans text-[0.8125rem] leading-none font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:bg-white/[0.08] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]";

export function McpUseCaseCategoryPill({
  icon,
  label,
  className,
}: McpUseCaseCategoryPillProps) {
  return (
    <span className={cn(MCP_USE_CASE_PILL_CLASS, className)}>
      <HugeiconsIcon className="text-primary size-3.5" icon={icon} />
      {label}
    </span>
  );
}
