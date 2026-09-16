import { HugeiconsIcon } from "@hugeicons/react";

import type { McpUseCaseCategoryPillProps } from "@/types/mcp-use-cases";

export function McpUseCaseCategoryPill({
  icon,
  label,
}: McpUseCaseCategoryPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3 pl-2.5 font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:bg-white/[0.08] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
      <HugeiconsIcon className="text-primary size-3.5" icon={icon} />
      {label}
    </span>
  );
}
