import { cn } from "@notra/ui/lib/utils";

import { CRAWLER_CATEGORY_COPY } from "@/constants/ip-checker";
import type { CrawlerAgentTagProps } from "@/types/ip-checker";

export function CrawlerAgentTag({ agent }: CrawlerAgentTagProps) {
  const copy = CRAWLER_CATEGORY_COPY[agent.category];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E1E1E14] bg-white py-1 pr-1 pl-2 font-mono text-[0.8125rem]/4 whitespace-nowrap text-[#1E1E1E] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
      {agent.name}
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-sans text-[0.6875rem]/3.5 font-medium whitespace-nowrap",
          copy.className
        )}
      >
        {copy.label}
      </span>
    </span>
  );
}
