import { useState } from "react";

import { MCP_VISIBLE_TOOL_COUNT } from "@/constants/mcp";
import type { McpToolCard, McpToolsGridProps } from "@/types/mcp";
import { formatMcpMoreToolsLabel } from "@/utils/mcp";

const CARD_CLASSNAME =
  "flex flex-col gap-1 rounded-2xl px-5.5 py-4.5 [box-shadow:#ECECEC_0rem_0rem_0rem_0.0625rem] dark:[box-shadow:#FFFFFF14_0rem_0rem_0rem_0.0625rem]";

function ToolCard({ tool }: { tool: McpToolCard }) {
  return (
    <div className={CARD_CLASSNAME}>
      <span className="font-mono text-[0.875rem] leading-[1.36] font-medium text-[#1E1E1E] dark:text-white">
        {tool.name}
      </span>
      <span className="font-sans text-[0.8125rem] leading-[1.46] text-[#1E1E1EA6] dark:text-white/60">
        {tool.description}
      </span>
    </div>
  );
}

export function McpToolsGrid({ tools }: McpToolsGridProps) {
  const [showAllTools, setShowAllTools] = useState(false);

  const visibleTools = tools.slice(0, MCP_VISIBLE_TOOL_COUNT);
  const hiddenTools = tools.slice(MCP_VISIBLE_TOOL_COUNT);

  return (
    <section className="flex w-full flex-col gap-5">
      <h2 className="font-display text-[1.75rem] leading-[1.21] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
        What your agent can do
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {visibleTools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
        {showAllTools ? (
          hiddenTools.map((tool) => <ToolCard key={tool.name} tool={tool} />)
        ) : (
          <button
            className="focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#E4E4E7] px-5.5 py-4.5 transition-colors outline-none hover:border-[#D4D4D8] focus-visible:ring-2 dark:border-white/15 dark:hover:border-white/25"
            onClick={() => setShowAllTools(true)}
            type="button"
          >
            <span className="font-sans text-[0.875rem] leading-[1.36] font-medium text-[#1E1E1E80] dark:text-white/50">
              {formatMcpMoreToolsLabel(hiddenTools.length)}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
