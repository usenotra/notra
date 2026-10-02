import { useState } from "react";

import { DETAIL_VISIBLE_TOOLS } from "@/constants/integrations";
import { getToolDescription } from "@/lib/integrations/helpers";
import type {
  IntegrationTool,
  IntegrationToolsGridProps,
} from "@/types/integrations";

const TOOL_CARD =
  "flex flex-col gap-1 rounded-2xl px-5.5 py-4.5 [box-shadow:#ECECEC_0_0_0_0.0625rem] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]";

function ToolCard({ tool }: { tool: IntegrationTool }) {
  const description = getToolDescription(tool);

  return (
    <div className={TOOL_CARD}>
      <span className="truncate font-mono text-[0.875rem] leading-[1.36] font-medium text-[#1E1E1E] dark:text-white">
        {tool.name}
      </span>
      {description ? (
        <span className="line-clamp-2 font-sans text-[0.8125rem] leading-[1.46] text-[#1E1E1EA6] dark:text-white/60">
          {description}
        </span>
      ) : null}
    </div>
  );
}

export function IntegrationToolsGrid({
  tools,
  totalCount,
}: IntegrationToolsGridProps) {
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) {
    return null;
  }

  const visibleTools = expanded ? tools : tools.slice(0, DETAIL_VISIBLE_TOOLS);
  const remaining = totalCount - visibleTools.length;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-sans text-[1.75rem] leading-[1.21] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
        Tools
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visibleTools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
        {!expanded && remaining > 0 ? (
          <button
            className="focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded-2xl px-5.5 py-4.5 [box-shadow:#ECECEC_0_0_0_0.0625rem] transition-colors outline-none hover:bg-[#FAFAFA] focus-visible:ring-2 dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:bg-white/[0.04]"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <span className="font-sans text-[0.875rem] leading-[1.36] font-medium text-[#1E1E1E80] dark:text-white/50">
              + {remaining} more {remaining === 1 ? "tool" : "tools"}
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
